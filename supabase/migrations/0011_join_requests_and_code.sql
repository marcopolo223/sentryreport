-- Fix pending join requests not showing for admins (users RLS),
-- and use 8-character join codes.

create or replace function public.can_admin_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.memberships admin_m
      join public.memberships target_m
        on target_m.organization_id = admin_m.organization_id
      where admin_m.user_id = auth.uid()
        and admin_m.status = 'approved'
        and admin_m.role in ('owner', 'admin')
        and target_m.user_id = target_user_id
    );
$$;

revoke all on function public.can_admin_read_profile(uuid) from public;
grant execute on function public.can_admin_read_profile(uuid) to authenticated;

drop policy if exists "org admins can read member profiles" on public.users;
create policy "org admins can read member profiles"
  on public.users for select
  using (public.can_admin_read_profile(id));

-- Pending joiners need to read the org name on the dashboard.
create or replace function public.can_read_organization(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status in ('approved', 'pending')
  );
$$;

revoke all on function public.can_read_organization(uuid) from public;
grant execute on function public.can_read_organization(uuid) to authenticated;

drop policy if exists "org members can read their org" on public.organizations;
create policy "org members can read their org"
  on public.organizations for select
  using (public.can_read_organization(id));

create or replace function public.next_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  generated text;
  i integer;
begin
  loop
    generated := '';
    for i in 1..8 loop
      generated := generated || substr(
        alphabet,
        1 + (floor(random() * length(alphabet)))::integer,
        1
      );
    end loop;
    exit when not exists (
      select 1 from public.organizations where join_code = generated
    );
  end loop;
  return generated;
end;
$$;

revoke all on function public.next_join_code() from public;

create or replace function public.request_to_join_organization(code text)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org public.organizations;
  new_membership public.memberships;
  existing public.memberships;
  normalized text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized := upper(regexp_replace(trim(code), '\s+', '', 'g'));

  select * into target_org
  from public.organizations
  where join_code = normalized;

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

create or replace function public.regenerate_join_code(org_id uuid)
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
  generated_code := public.next_join_code();

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

create or replace function public.create_organization(
  org_name text,
  building_address text,
  building_names text[],
  agency_name text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
  generated_code text;
  building_name text;
  created_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'Organization name is required';
  end if;

  if building_address is null or length(trim(building_address)) = 0 then
    raise exception 'Building address is required';
  end if;

  if building_names is null or coalesce(array_length(building_names, 1), 0) = 0 then
    raise exception 'Add at least one building';
  end if;

  generated_code := public.next_join_code();

  insert into public.organizations (name, agency_name, address, join_code, created_by, plan_id)
  values (
    trim(org_name),
    nullif(trim(coalesce(agency_name, '')), ''),
    trim(building_address),
    generated_code,
    auth.uid(),
    'free'
  )
  returning * into new_org;

  insert into public.memberships (user_id, organization_id, role, status, approved_at)
  values (auth.uid(), new_org.id, 'owner', 'approved', now());

  foreach building_name in array building_names
  loop
    if building_name is null or length(trim(building_name)) = 0 then
      continue;
    end if;

    insert into public.buildings (organization_id, name, address)
    values (new_org.id, trim(building_name), trim(building_address));

    created_count := created_count + 1;
  end loop;

  if created_count = 0 then
    raise exception 'Add at least one building';
  end if;

  perform public.seed_organization_intake(new_org.id);

  insert into public.org_billing (organization_id)
  values (new_org.id)
  on conflict (organization_id) do nothing;

  insert into public.audit_log (organization_id, user_id, action, new_value)
  values (
    new_org.id,
    auth.uid(),
    'organization.created',
    jsonb_build_object(
      'name', trim(org_name),
      'agency_name', nullif(trim(coalesce(agency_name, '')), ''),
      'address', trim(building_address),
      'buildings', created_count
    )
  );

  return new_org;
end;
$$;
