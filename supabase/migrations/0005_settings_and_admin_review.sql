-- Settings, admin review writes, finalize, branding storage, amendments table.

-- -----------------------------------------------------------------------------
-- ADMIN FIELD WRITES (draft + submitted, never finalized)
-- -----------------------------------------------------------------------------
create function public.can_write_report_fields(target_report_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.reports r
    join public.memberships m
      on m.organization_id = r.organization_id
     and m.user_id = auth.uid()
     and m.status = 'approved'
    where r.id = target_report_id
      and r.status in ('draft', 'submitted')
      and (
        (
          r.status = 'draft'
          and (r.created_by = auth.uid() or m.role in ('owner', 'admin'))
        )
        or (
          r.status = 'submitted'
          and m.role in ('owner', 'admin')
        )
      )
  );
$$;

grant execute on function public.can_write_report_fields(uuid) to authenticated;

drop policy if exists "authors update own drafts" on public.reports;
create policy "members update writable reports"
  on public.reports for update
  using (public.can_write_report_fields(id))
  with check (public.can_write_report_fields(id));

drop policy if exists "edit draft agencies" on public.report_agencies;
create policy "edit writable agencies"
  on public.report_agencies for all
  using (public.can_write_report_fields(report_id))
  with check (public.can_write_report_fields(report_id));

drop policy if exists "edit draft vehicles" on public.report_vehicles;
create policy "edit writable vehicles"
  on public.report_vehicles for all
  using (public.can_write_report_fields(report_id))
  with check (public.can_write_report_fields(report_id));

drop policy if exists "edit draft people" on public.report_people;
create policy "edit writable people"
  on public.report_people for all
  using (public.can_write_report_fields(report_id))
  with check (public.can_write_report_fields(report_id));

drop policy if exists "edit draft damage" on public.report_property_damage;
create policy "edit writable damage"
  on public.report_property_damage for all
  using (public.can_write_report_fields(report_id))
  with check (public.can_write_report_fields(report_id));

drop policy if exists "edit draft answers" on public.report_answers;
create policy "edit writable answers"
  on public.report_answers for all
  using (public.can_write_report_fields(report_id))
  with check (public.can_write_report_fields(report_id));

drop policy if exists "insert draft media" on public.report_media;
create policy "insert writable media"
  on public.report_media for insert
  with check (public.can_write_report_fields(report_id));

drop policy if exists "delete draft media" on public.report_media;
create policy "delete writable media"
  on public.report_media for delete
  using (public.can_write_report_fields(report_id));

drop policy if exists "upload draft media objects" on storage.objects;
create policy "upload writable media objects"
  on storage.objects for insert
  with check (
    bucket_id = 'report-media'
    and public.can_write_report_fields(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "update draft media objects" on storage.objects;
create policy "update writable media objects"
  on storage.objects for update
  using (
    bucket_id = 'report-media'
    and public.can_write_report_fields(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "delete draft media objects" on storage.objects;
create policy "delete writable media objects"
  on storage.objects for delete
  using (
    bucket_id = 'report-media'
    and public.can_write_report_fields(((storage.foldername(name))[2])::uuid)
  );

-- -----------------------------------------------------------------------------
-- FINALIZE
-- -----------------------------------------------------------------------------
create function public.finalize_report(target_report_id uuid, signature_path text)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_report public.reports;
  updated_report public.reports;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if signature_path is null or length(trim(signature_path)) = 0 then
    raise exception 'Signature is required';
  end if;

  select * into current_report
  from public.reports
  where id = target_report_id;

  if current_report.id is null then
    raise exception 'Report not found';
  end if;

  if not public.is_org_admin(current_report.organization_id) then
    raise exception 'Only an admin or owner can finalize a report';
  end if;

  if current_report.status <> 'submitted' then
    raise exception 'Only submitted reports can be finalized';
  end if;

  perform set_config('app.allow_report_status', 'true', true);

  update public.reports
  set status = 'finalized',
      finalized_at = now(),
      admin_signature_path = trim(signature_path),
      admin_signed_at = now(),
      final_narrative = coalesce(
        nullif(trim(coalesce(final_narrative, '')), ''),
        original_summary
      )
  where id = target_report_id
  returning * into updated_report;

  insert into public.audit_log (
    organization_id, user_id, report_id, action, previous_value, new_value
  ) values (
    updated_report.organization_id,
    auth.uid(),
    updated_report.id,
    'report.finalized',
    jsonb_build_object('status', 'submitted'),
    jsonb_build_object('status', 'finalized', 'report_number', updated_report.report_number)
  );

  return updated_report;
end;
$$;

grant execute on function public.finalize_report(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- AMENDMENTS (additive records on finalized reports; UI comes later)
-- -----------------------------------------------------------------------------
create table public.report_amendments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.users (id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.report_amendments enable row level security;

create policy "read report amendments"
  on public.report_amendments for select
  using (public.can_read_report(report_id));

create policy "admins insert amendments on finalized reports"
  on public.report_amendments for insert
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1 from public.reports r
      where r.id = report_id
        and r.organization_id = organization_id
        and r.status = 'finalized'
    )
  );

-- -----------------------------------------------------------------------------
-- ORG PROFILE: admins can update name/address; owner-only branding/plan
-- -----------------------------------------------------------------------------
drop policy if exists "org owner can update org" on public.organizations;

create policy "org admins can update org"
  on public.organizations for update
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create function public.protect_org_restricted_columns()
returns trigger
language plpgsql
as $$
begin
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

create trigger organizations_protect_restricted
  before update on public.organizations
  for each row execute procedure public.protect_org_restricted_columns();

create policy "org admins can delete buildings"
  on public.buildings for delete
  using (public.is_org_admin(organization_id));

create policy "org admins can delete units"
  on public.building_units for delete
  using (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- BRANDING STORAGE
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('org-branding', 'org-branding', true, 5242880)
on conflict (id) do nothing;

create policy "public read org branding"
  on storage.objects for select
  using (bucket_id = 'org-branding');

create policy "owners upload org branding"
  on storage.objects for insert
  with check (
    bucket_id = 'org-branding'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "owners update org branding"
  on storage.objects for update
  using (
    bucket_id = 'org-branding'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "owners delete org branding"
  on storage.objects for delete
  using (
    bucket_id = 'org-branding'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  );
