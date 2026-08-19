-- SentryReport v2 — Phase 1
-- Tenancy: users, organizations, memberships, buildings, units, audit log.
-- Default-deny RLS. Exactly one approved Owner per organization.

create extension if not exists "pgcrypto";

create type public.membership_role as enum ('owner', 'admin', 'officer');
create type public.membership_status as enum ('pending', 'approved', 'rejected', 'removed');

-- -----------------------------------------------------------------------------
-- USERS
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- ORGANIZATIONS (one property each)
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  logo_url text,
  banner_url text,
  created_by uuid not null references public.users (id),
  officer_can_view_own_reports boolean not null default true,
  plan_id text not null default 'free',
  created_at timestamptz not null default now(),
  constraint organizations_plan_id_check
    check (plan_id in ('free', 'standard', 'pro'))
);

-- -----------------------------------------------------------------------------
-- BUILDINGS + UNITS
-- -----------------------------------------------------------------------------
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table public.building_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  building_id uuid not null references public.buildings (id) on delete cascade,
  unit_number text not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (building_id, unit_number)
);

-- -----------------------------------------------------------------------------
-- MEMBERSHIPS
-- -----------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.membership_role not null default 'officer',
  status public.membership_status not null default 'pending',
  invited_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (user_id, organization_id)
);

create unique index one_approved_owner_per_org
  on public.memberships (organization_id)
  where role = 'owner' and status = 'approved';

-- -----------------------------------------------------------------------------
-- AUDIT LOG (insert-only)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.users (id),
  report_id uuid,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

revoke update, delete on public.audit_log from anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS HELPERS
-- -----------------------------------------------------------------------------
create function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
  );
$$;

create function public.is_org_admin(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
      and m.role in ('owner', 'admin')
  );
$$;

create function public.is_org_owner(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
      and m.role = 'owner'
  );
$$;

-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY (default deny)
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.buildings enable row level security;
alter table public.building_units enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_log enable row level security;

create policy "users read own row"
  on public.users for select
  using (id = auth.uid());

create policy "org admins can read member profiles"
  on public.users for select
  using (
    exists (
      select 1
      from public.memberships m_admin
      join public.memberships m_target
        on m_target.organization_id = m_admin.organization_id
      where m_admin.user_id = auth.uid()
        and m_admin.status = 'approved'
        and m_admin.role in ('owner', 'admin')
        and m_target.user_id = users.id
    )
  );

create policy "users update own row"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "org members can read their org"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "authenticated users can create an org"
  on public.organizations for insert
  with check (auth.uid() = created_by);

create policy "org owner can update org"
  on public.organizations for update
  using (public.is_org_owner(id))
  with check (public.is_org_owner(id));

create policy "org members can read buildings"
  on public.buildings for select
  using (public.is_org_member(organization_id));

create policy "org admins can insert buildings"
  on public.buildings for insert
  with check (public.is_org_admin(organization_id));

create policy "org admins can update buildings"
  on public.buildings for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "org members can read units"
  on public.building_units for select
  using (public.is_org_member(organization_id));

create policy "org admins can insert units"
  on public.building_units for insert
  with check (public.is_org_admin(organization_id));

create policy "org admins can update units"
  on public.building_units for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "user can read own memberships"
  on public.memberships for select
  using (user_id = auth.uid());

create policy "org admins can read all org memberships"
  on public.memberships for select
  using (public.is_org_admin(organization_id));

create policy "user can request to join an org"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and role = 'officer'
  );

create policy "org admins can update memberships"
  on public.memberships for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "org admins can read audit log"
  on public.audit_log for select
  using (public.is_org_admin(organization_id));

create policy "org admins can insert audit log rows"
  on public.audit_log for insert
  with check (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------
create function public.create_organization(
  org_name text,
  building_name text,
  unit_number text,
  unit_label text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
  new_building public.buildings;
  generated_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'Organization name is required';
  end if;

  if building_name is null or length(trim(building_name)) = 0 then
    raise exception 'Building name is required';
  end if;

  if unit_number is null or length(trim(unit_number)) = 0 then
    raise exception 'At least one unit is required';
  end if;

  loop
    generated_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (
      select 1 from public.organizations where join_code = generated_code
    );
  end loop;

  insert into public.organizations (name, join_code, created_by, plan_id)
  values (trim(org_name), generated_code, auth.uid(), 'free')
  returning * into new_org;

  insert into public.memberships (user_id, organization_id, role, status, approved_at)
  values (auth.uid(), new_org.id, 'owner', 'approved', now());

  insert into public.buildings (organization_id, name)
  values (new_org.id, trim(building_name))
  returning * into new_building;

  insert into public.building_units (organization_id, building_id, unit_number, label)
  values (
    new_org.id,
    new_building.id,
    trim(unit_number),
    nullif(trim(coalesce(unit_label, '')), '')
  );

  insert into public.audit_log (organization_id, user_id, action, new_value)
  values (
    new_org.id,
    auth.uid(),
    'organization.created',
    jsonb_build_object(
      'name', trim(org_name),
      'building', trim(building_name),
      'unit', trim(unit_number)
    )
  );

  return new_org;
end;
$$;

create function public.request_to_join_organization(code text)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org public.organizations;
  new_membership public.memberships;
  existing public.memberships;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_org
  from public.organizations
  where join_code = upper(trim(code));

  if target_org.id is null then
    raise exception 'Invalid join code';
  end if;

  select * into existing
  from public.memberships
  where user_id = auth.uid() and organization_id = target_org.id;

  if found then
    if existing.status in ('approved', 'pending') then
      raise exception 'You already have a membership for this organization';
    end if;

    update public.memberships
    set status = 'pending',
        role = 'officer',
        approved_at = null,
        invited_by = null
    where id = existing.id
    returning * into new_membership;
  else
    insert into public.memberships (user_id, organization_id, role, status)
    values (auth.uid(), target_org.id, 'officer', 'pending')
    returning * into new_membership;
  end if;

  insert into public.audit_log (organization_id, user_id, action, new_value)
  values (
    target_org.id,
    auth.uid(),
    'membership.requested',
    jsonb_build_object('membership_id', new_membership.id)
  );

  return new_membership;
end;
$$;

create function public.decide_membership(
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

create function public.regenerate_join_code(org_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_org public.organizations;
  generated_code text;
  prior_code text;
begin
  if not public.is_org_owner(org_id) then
    raise exception 'Only the organization owner can regenerate the join code';
  end if;

  select join_code into prior_code from public.organizations where id = org_id;

  loop
    generated_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (
      select 1 from public.organizations where join_code = generated_code
    );
  end loop;

  update public.organizations
  set join_code = generated_code
  where id = org_id
  returning * into updated_org;

  insert into public.audit_log (
    organization_id, user_id, action, previous_value, new_value
  )
  values (
    org_id,
    auth.uid(),
    'organization.join_code_regenerated',
    jsonb_build_object('join_code', prior_code),
    jsonb_build_object('join_code', generated_code)
  );

  return updated_org;
end;
$$;

grant execute on function public.create_organization(text, text, text, text) to authenticated;
grant execute on function public.request_to_join_organization(text) to authenticated;
grant execute on function public.decide_membership(uuid, public.membership_status, public.membership_role) to authenticated;
grant execute on function public.regenerate_join_code(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
