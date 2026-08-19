-- SentryReport v2 — Owner can delete an organization after the paid period ends.

create function public.org_has_active_paid_subscription(target_org_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.org_billing
    where organization_id = target_org_id
      and (
        status in ('trialing', 'active', 'past_due')
        or (
          status = 'canceled'
          and current_period_end is not null
          and current_period_end > now()
        )
      )
  );
$$;

create function public.delete_organization(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  period_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_owner(target_org_id) then
    raise exception 'Only the owner can delete this organization';
  end if;

  if public.org_has_active_paid_subscription(target_org_id) then
    select current_period_end into period_end
    from public.org_billing
    where organization_id = target_org_id;

    if period_end is not null and period_end > now() then
      raise exception
        'This organization has a paid subscription until %. Delete it after that date.',
        to_char(period_end at time zone 'utc', 'FMMonth FMDD, YYYY');
    end if;

    raise exception
      'Cancel the paid subscription and wait until the current period ends before deleting this organization.';
  end if;

  delete from public.organizations where id = target_org_id;
end;
$$;

revoke all on function public.org_has_active_paid_subscription(uuid) from public, anon, authenticated;
revoke all on function public.delete_organization(uuid) from public;
grant execute on function public.delete_organization(uuid) to authenticated;
