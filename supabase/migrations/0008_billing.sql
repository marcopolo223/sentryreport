-- SentryReport v2 — Phase 4
-- Owner-level Stripe billing: one customer per owner, one item per org.

create type public.subscription_status as enum (
  'none',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid'
);

create table public.billing_customers (
  user_id uuid primary key references public.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_billing (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_subscription_id text,
  stripe_subscription_item_id text,
  stripe_price_id text,
  status public.subscription_status not null default 'none',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index org_billing_subscription_idx
  on public.org_billing (stripe_subscription_id);

create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
alter table public.org_billing enable row level security;
alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from anon, authenticated;
revoke update, delete on public.billing_customers from anon, authenticated;
revoke insert, update, delete on public.org_billing from anon, authenticated;

create policy "owners read own billing customer"
  on public.billing_customers for select
  using (user_id = auth.uid());

create policy "owners insert own billing customer"
  on public.billing_customers for insert
  with check (user_id = auth.uid());

create policy "org admins read org billing"
  on public.org_billing for select
  using (public.is_org_admin(organization_id));

insert into public.org_billing (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

-- Officer seat limits: Free 2, Standard 8, Pro unlimited.
create or replace function public.decide_membership(
  target_membership_id uuid,
  new_status public.membership_status,
  grant_role public.membership_role default 'officer'
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_membership public.memberships;
  target_org_id uuid;
  prior_status public.membership_status;
  prior_role public.membership_role;
  assigned_role public.membership_role;
  org_plan text;
  officer_limit integer;
  officer_count integer;
begin
  select organization_id, status, role
    into target_org_id, prior_status, prior_role
  from public.memberships
  where id = target_membership_id;

  if target_org_id is null then
    raise exception 'Membership not found';
  end if;

  if not public.is_org_admin(target_org_id) then
    raise exception 'Not authorized to decide on this membership';
  end if;

  if new_status not in ('approved', 'rejected', 'removed') then
    raise exception 'Invalid decision status';
  end if;

  if prior_role = 'owner' and new_status in ('rejected', 'removed') then
    raise exception 'Cannot remove the organization owner';
  end if;

  assigned_role := prior_role;
  if new_status = 'approved' then
    if grant_role not in ('officer', 'admin') then
      raise exception 'Approvals can only grant Officer or Admin';
    end if;
    assigned_role := grant_role;
  end if;

  if new_status = 'approved' and assigned_role = 'officer' then
    select plan_id into org_plan
    from public.organizations
    where id = target_org_id;

    officer_limit := case org_plan
      when 'free' then 2
      when 'standard' then 8
      else null
    end;

    if officer_limit is not null
       and not (prior_status = 'approved' and prior_role = 'officer') then
      select count(*) into officer_count
      from public.memberships
      where organization_id = target_org_id
        and status = 'approved'
        and role = 'officer';

      if officer_count >= officer_limit then
        raise exception 'This plan allows % officers. Upgrade to add more.', officer_limit;
      end if;
    end if;
  end if;

  update public.memberships
  set status = new_status,
      role = assigned_role,
      approved_at = case
        when new_status = 'approved' then now()
        else approved_at
      end
  where id = target_membership_id
  returning * into updated_membership;

  insert into public.audit_log (
    organization_id, user_id, action, previous_value, new_value
  )
  values (
    target_org_id,
    auth.uid(),
    'membership.' || new_status::text,
    jsonb_build_object('status', prior_status, 'role', prior_role),
    jsonb_build_object('status', new_status, 'role', assigned_role)
  );

  return updated_membership;
end;
$$;

-- Webhooks (service role) must be able to change plan_id; the owner-protect trigger
-- would otherwise revert it because auth.uid() is null.
create or replace function public.protect_org_restricted_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_billing_update', true) = 'true' then
    return new;
  end if;

  if public.is_org_owner(new.id) then
    return new;
  end if;

  new.logo_url := old.logo_url;
  new.banner_url := old.banner_url;
  new.plan_id := old.plan_id;
  new.join_code := old.join_code;
  new.created_by := old.created_by;
  new.officer_can_view_own_reports := old.officer_can_view_own_reports;
  return new;
end;
$$;

create function public.apply_org_plan(target_org_id uuid, new_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_plan not in ('free', 'standard', 'pro') then
    raise exception 'Invalid plan';
  end if;
  perform set_config('app.allow_billing_update', 'true', true);
  update public.organizations
  set plan_id = new_plan
  where id = target_org_id;
end;
$$;

revoke all on function public.apply_org_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_org_plan(uuid, text) to service_role;
