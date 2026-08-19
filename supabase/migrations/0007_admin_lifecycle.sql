-- SentryReport v2 — Phase 3
-- Amendments, delete (any status), bulk delete, admin media cleanup.

-- -----------------------------------------------------------------------------
-- AMENDMENTS
-- -----------------------------------------------------------------------------
create function public.add_report_amendment(
  target_report_id uuid,
  amendment_body text
)
returns public.report_amendments
language plpgsql
security definer
set search_path = public
as $$
declare
  current_report public.reports;
  body_text text;
  new_amendment public.report_amendments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  body_text := trim(coalesce(amendment_body, ''));
  if length(body_text) = 0 then
    raise exception 'Amendment text is required';
  end if;

  select * into current_report
  from public.reports
  where id = target_report_id;

  if current_report.id is null then
    raise exception 'Report not found';
  end if;

  if not public.is_org_admin(current_report.organization_id) then
    raise exception 'Only an admin or owner can add an amendment';
  end if;

  if current_report.status <> 'finalized' then
    raise exception 'Only finalized reports can be amended';
  end if;

  insert into public.report_amendments (
    report_id, organization_id, created_by, body
  ) values (
    current_report.id,
    current_report.organization_id,
    auth.uid(),
    body_text
  )
  returning * into new_amendment;

  insert into public.audit_log (
    organization_id, user_id, report_id, action, new_value
  ) values (
    current_report.organization_id,
    auth.uid(),
    current_report.id,
    'report.amended',
    jsonb_build_object(
      'report_number', current_report.report_number,
      'amendment_id', new_amendment.id
    )
  );

  return new_amendment;
end;
$$;

grant execute on function public.add_report_amendment(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- DELETE (any status for admins; own drafts for officers)
-- -----------------------------------------------------------------------------
create function public.delete_report(target_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_report public.reports;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into current_report
  from public.reports
  where id = target_report_id;

  if current_report.id is null then
    raise exception 'Report not found';
  end if;

  if not public.is_org_admin(current_report.organization_id)
     and not public.can_edit_draft(target_report_id) then
    raise exception 'Not authorized to delete this report';
  end if;

  insert into public.audit_log (
    organization_id, user_id, report_id, action, previous_value
  ) values (
    current_report.organization_id,
    auth.uid(),
    null,
    'report.deleted',
    jsonb_build_object(
      'report_id', current_report.id,
      'report_number', current_report.report_number,
      'status', current_report.status
    )
  );

  delete from public.reports where id = target_report_id;
end;
$$;

create function public.delete_reports(target_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  deleted_count integer := 0;
begin
  if target_ids is null or coalesce(array_length(target_ids, 1), 0) = 0 then
    raise exception 'Select at least one report';
  end if;

  foreach target_id in array target_ids loop
    perform public.delete_report(target_id);
    deleted_count := deleted_count + 1;
  end loop;

  return deleted_count;
end;
$$;

grant execute on function public.delete_report(uuid) to authenticated;
grant execute on function public.delete_reports(uuid[]) to authenticated;

-- Admins can remove media objects for any report in their org (including finalized).
drop policy if exists "admins delete report media objects" on storage.objects;
create policy "admins delete report media objects"
  on storage.objects for delete
  using (
    bucket_id = 'report-media'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
