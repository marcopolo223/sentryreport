-- Organization name is the display name. Security agency is optional.

alter table public.organizations
  add column if not exists agency_name text;

drop function if exists public.create_organization(text, text, text[]);

create function public.create_organization(
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

  loop
    generated_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (
      select 1 from public.organizations where join_code = generated_code
    );
  end loop;

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

grant execute on function public.create_organization(text, text, text[], text) to authenticated;
