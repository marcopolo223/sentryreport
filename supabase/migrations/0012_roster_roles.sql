-- Approvals are always Officer. Admin is granted from the roster.

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
    if prior_role = 'owner' then
      assigned_role := 'owner';
    else
      assigned_role := 'officer';
    end if;
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
        when new_status = 'approved' then coalesce(approved_at, now())
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

create or replace function public.set_membership_role(
  target_membership_id uuid,
  new_role public.membership_role
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_membership public.memberships;
  target_org_id uuid;
  target_user_id uuid;
  prior_status public.membership_status;
  prior_role public.membership_role;
  org_plan text;
  officer_limit integer;
  officer_count integer;
begin
  select organization_id, user_id, status, role
    into target_org_id, target_user_id, prior_status, prior_role
  from public.memberships
  where id = target_membership_id;

  if target_org_id is null then
    raise exception 'Membership not found';
  end if;

  if not public.is_org_admin(target_org_id) then
    raise exception 'Not authorized to change roles';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  if prior_status <> 'approved' then
    raise exception 'Only approved members can change roles';
  end if;

  if prior_role = 'owner' or new_role = 'owner' then
    raise exception 'Owner cannot be changed this way';
  end if;

  if new_role not in ('officer', 'admin') then
    raise exception 'Role must be Officer or Admin';
  end if;

  if new_role = prior_role then
    select * into updated_membership
    from public.memberships
    where id = target_membership_id;
    return updated_membership;
  end if;

  if new_role = 'officer' then
    select plan_id into org_plan
    from public.organizations
    where id = target_org_id;

    officer_limit := case org_plan
      when 'free' then 2
      when 'standard' then 8
      else null
    end;

    if officer_limit is not null then
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
  set role = new_role
  where id = target_membership_id
  returning * into updated_membership;

  insert into public.audit_log (
    organization_id, user_id, action, previous_value, new_value
  )
  values (
    target_org_id,
    auth.uid(),
    'membership.role_changed',
    jsonb_build_object('role', prior_role),
    jsonb_build_object('role', new_role, 'membership_id', target_membership_id)
  );

  return updated_membership;
end;
$$;

revoke all on function public.set_membership_role(uuid, public.membership_role) from public;
grant execute on function public.set_membership_role(uuid, public.membership_role) to authenticated;
