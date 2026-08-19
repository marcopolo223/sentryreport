-- SentryReport v2 — Phase 2
-- Reports hybrid model, intake questions, media, draft/submit RPCs.
-- Seed default incident types + questions on every organization.

create type public.report_status as enum ('draft', 'submitted', 'finalized');
create type public.form_section as enum (
  'incident_location',
  'emergency_services',
  'victim_injury',
  'vehicles',
  'property_damage',
  'incident_details',
  'admin_header'
);
create type public.question_field_type as enum (
  'text',
  'number',
  'date',
  'boolean',
  'dropdown',
  'multi_select'
);
create type public.agency_kind as enum ('police', 'fire', 'fire_rescue');
create type public.person_kind as enum ('victim', 'witness', 'other');
create type public.injured_party_type as enum (
  'resident',
  'guest',
  'employee',
  'trespasser'
);
create type public.damage_type as enum (
  'vehicle',
  'building',
  'common_area',
  'personal_property'
);
create type public.media_kind as enum ('photo', 'video');

-- -----------------------------------------------------------------------------
-- CATALOG + QUESTIONS
-- -----------------------------------------------------------------------------
create table public.org_incident_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.org_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  question_key text not null,
  section public.form_section not null,
  label text not null,
  field_type public.question_field_type not null,
  required boolean not null default false,
  is_default boolean not null default true,
  display_order integer not null default 0,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, question_key, version)
);

create unique index org_questions_one_active_key
  on public.org_questions (organization_id, question_key)
  where is_active;

create table public.org_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.org_questions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  value text not null,
  label text not null,
  sort_order integer not null default 0
);

create table public.org_question_conditions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.org_questions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  depends_on_question_id uuid not null references public.org_questions (id) on delete cascade,
  expected_value text not null
);

create table public.report_number_sequences (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_value integer not null default 0
);

-- -----------------------------------------------------------------------------
-- REPORTS
-- -----------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_number text not null,
  status public.report_status not null default 'draft',
  building_id uuid references public.buildings (id) on delete set null,
  unit_id uuid references public.building_units (id) on delete set null,
  location_detail text,
  incident_type_id uuid references public.org_incident_types (id) on delete set null,
  occurred_at timestamptz,
  created_by uuid not null references public.users (id),
  submitted_at timestamptz,
  finalized_at timestamptz,
  original_summary text,
  ai_narrative text,
  final_narrative text,
  officer_signature_path text,
  officer_signed_at timestamptz,
  admin_signature_path text,
  admin_signed_at timestamptz,
  dispatch_number text,
  number_1096 text,
  number_1097 text,
  complainant_name text,
  complainant_phone text,
  writer_name text,
  property_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, report_number)
);

create index reports_org_status_created_idx
  on public.reports (organization_id, status, created_at desc);
create index reports_author_idx
  on public.reports (created_by, organization_id);

create table public.report_agencies (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.agency_kind not null,
  involved boolean not null default false,
  department text,
  responder_id text,
  responder_name text,
  case_number text,
  unique (report_id, kind)
);

create table public.report_vehicles (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sort_order integer not null default 0,
  make_model text,
  color text,
  license_plate text,
  driver_name text
);

create table public.report_people (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.person_kind not null default 'victim',
  injured_party_type public.injured_party_type,
  transported_to_hospital boolean,
  injury_description text,
  name text
);

create table public.report_property_damage (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  has_damage boolean not null default false,
  damage_type public.damage_type,
  description text,
  estimated_cost numeric(12, 2)
);

create table public.report_answers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  question_id uuid not null references public.org_questions (id),
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (report_id, question_id)
);

create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null,
  content_type text,
  byte_size integer,
  duration_seconds numeric,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

alter table public.audit_log
  add constraint audit_log_report_id_fkey
  foreign key (report_id) references public.reports (id) on delete set null;

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------
create function public.touch_report_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute procedure public.touch_report_updated_at();

create function public.protect_report_identity()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_report_status', true) = 'true' then
    return new;
  end if;

  new.status := old.status;
  new.report_number := old.report_number;
  new.organization_id := old.organization_id;
  new.created_by := old.created_by;
  new.submitted_at := old.submitted_at;
  new.finalized_at := old.finalized_at;
  new.officer_signature_path := old.officer_signature_path;
  new.officer_signed_at := old.officer_signed_at;
  new.admin_signature_path := old.admin_signature_path;
  new.admin_signed_at := old.admin_signed_at;
  return new;
end;
$$;

create trigger reports_protect_identity
  before update on public.reports
  for each row execute procedure public.protect_report_identity();

-- -----------------------------------------------------------------------------
-- RLS HELPERS
-- -----------------------------------------------------------------------------
create function public.can_read_report(target_report_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.reports r
    join public.organizations o on o.id = r.organization_id
    join public.memberships m
      on m.organization_id = r.organization_id
     and m.user_id = auth.uid()
     and m.status = 'approved'
    where r.id = target_report_id
      and (
        m.role in ('owner', 'admin')
        or (
          r.created_by = auth.uid()
          and (
            r.status = 'draft'
            or o.officer_can_view_own_reports
          )
        )
      )
  );
$$;

create function public.can_edit_draft(target_report_id uuid)
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
      and r.status = 'draft'
      and (
        m.role in ('owner', 'admin')
        or r.created_by = auth.uid()
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- SEED DEFAULT INTAKE
-- -----------------------------------------------------------------------------
create function public.seed_organization_intake(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q_incident uuid;
  q_police uuid;
  q_fire uuid;
  q_ems uuid;
  q_injured uuid;
  q_damage uuid;
  q_id uuid;
  type_row record;
begin
  insert into public.report_number_sequences (organization_id)
  values (org_id)
  on conflict (organization_id) do nothing;

  if exists (
    select 1 from public.org_incident_types where organization_id = org_id
  ) then
    return;
  end if;

  insert into public.org_incident_types (organization_id, slug, label, sort_order)
  values
    (org_id, 'suspicious_activity', 'Suspicious activity', 1),
    (org_id, 'disturbance', 'Disturbance', 2),
    (org_id, 'trespassing', 'Trespassing', 3),
    (org_id, 'theft', 'Theft', 4),
    (org_id, 'vandalism', 'Vandalism', 5),
    (org_id, 'medical', 'Medical', 6),
    (org_id, 'fire', 'Fire', 7),
    (org_id, 'noise_complaint', 'Noise complaint', 8),
    (org_id, 'parking_violation', 'Parking violation', 9),
    (org_id, 'other', 'Other', 10);

  insert into public.org_questions (
    organization_id, question_key, section, label, field_type, required, display_order
  ) values
    (org_id, 'incident_type', 'incident_location', 'What happened?', 'dropdown', true, 10),
    (org_id, 'building', 'incident_location', 'Building', 'dropdown', true, 20),
    (org_id, 'unit', 'incident_location', 'Unit', 'dropdown', false, 30),
    (org_id, 'occurred_at', 'incident_location', 'When did this happen?', 'date', true, 40),
    (org_id, 'location_detail', 'incident_location', 'Location detail', 'text', false, 50),
    (org_id, 'police_called', 'emergency_services', 'Were police called?', 'boolean', false, 60),
    (org_id, 'police_department', 'emergency_services', 'Police department', 'text', false, 61),
    (org_id, 'police_badge', 'emergency_services', 'Badge / officer ID', 'text', false, 62),
    (org_id, 'police_case_number', 'emergency_services', 'Police case number', 'text', false, 63),
    (org_id, 'fire_called', 'emergency_services', 'Was fire called?', 'boolean', false, 70),
    (org_id, 'fire_department', 'emergency_services', 'Fire department', 'text', false, 71),
    (org_id, 'fire_unit', 'emergency_services', 'Unit / truck ID', 'text', false, 72),
    (org_id, 'ems_called', 'emergency_services', 'Was fire rescue / EMS called?', 'boolean', false, 80),
    (org_id, 'ems_department', 'emergency_services', 'EMS department', 'text', false, 81),
    (org_id, 'ems_responder_id', 'emergency_services', 'Responder ID', 'text', false, 82),
    (org_id, 'ems_responder_name', 'emergency_services', 'Responder name', 'text', false, 83),
    (org_id, 'anyone_injured', 'victim_injury', 'Was anyone injured?', 'boolean', false, 90),
    (org_id, 'injured_party_type', 'victim_injury', 'Injured party', 'dropdown', false, 91),
    (org_id, 'transported_to_hospital', 'victim_injury', 'Transported to hospital?', 'boolean', false, 92),
    (org_id, 'injury_description', 'victim_injury', 'Injury description', 'text', false, 93),
    (org_id, 'vehicles_involved', 'vehicles', 'Were vehicles involved?', 'boolean', false, 100),
    (org_id, 'has_property_damage', 'property_damage', 'Was there property damage?', 'boolean', false, 110),
    (org_id, 'damage_type', 'property_damage', 'Damage type', 'dropdown', false, 111),
    (org_id, 'damage_description', 'property_damage', 'Damage description', 'text', false, 112),
    (org_id, 'estimated_cost', 'property_damage', 'Estimated cost', 'number', false, 113),
    (org_id, 'original_summary', 'incident_details', 'What happened?', 'text', true, 120);

  select id into q_incident
  from public.org_questions
  where organization_id = org_id and question_key = 'incident_type' and is_active;

  for type_row in
    select slug, label, sort_order
    from public.org_incident_types
    where organization_id = org_id
    order by sort_order
  loop
    insert into public.org_question_options (
      question_id, organization_id, value, label, sort_order
    ) values (q_incident, org_id, type_row.slug, type_row.label, type_row.sort_order);
  end loop;

  select id into q_id
  from public.org_questions
  where organization_id = org_id and question_key = 'injured_party_type' and is_active;

  insert into public.org_question_options (question_id, organization_id, value, label, sort_order)
  values
    (q_id, org_id, 'resident', 'Resident', 1),
    (q_id, org_id, 'guest', 'Guest', 2),
    (q_id, org_id, 'employee', 'Employee', 3),
    (q_id, org_id, 'trespasser', 'Trespasser', 4);

  select id into q_id
  from public.org_questions
  where organization_id = org_id and question_key = 'damage_type' and is_active;

  insert into public.org_question_options (question_id, organization_id, value, label, sort_order)
  values
    (q_id, org_id, 'vehicle', 'Vehicle', 1),
    (q_id, org_id, 'building', 'Building', 2),
    (q_id, org_id, 'common_area', 'Common area', 3),
    (q_id, org_id, 'personal_property', 'Personal property', 4);

  select id into q_police from public.org_questions
    where organization_id = org_id and question_key = 'police_called' and is_active;
  select id into q_fire from public.org_questions
    where organization_id = org_id and question_key = 'fire_called' and is_active;
  select id into q_ems from public.org_questions
    where organization_id = org_id and question_key = 'ems_called' and is_active;
  select id into q_injured from public.org_questions
    where organization_id = org_id and question_key = 'anyone_injured' and is_active;
  select id into q_damage from public.org_questions
    where organization_id = org_id and question_key = 'has_property_damage' and is_active;

  insert into public.org_question_conditions (
    question_id, organization_id, depends_on_question_id, expected_value
  )
  select q.id, org_id, q_police, 'true'
  from public.org_questions q
  where q.organization_id = org_id
    and q.question_key in ('police_department', 'police_badge', 'police_case_number');

  insert into public.org_question_conditions (
    question_id, organization_id, depends_on_question_id, expected_value
  )
  select q.id, org_id, q_fire, 'true'
  from public.org_questions q
  where q.organization_id = org_id
    and q.question_key in ('fire_department', 'fire_unit');

  insert into public.org_question_conditions (
    question_id, organization_id, depends_on_question_id, expected_value
  )
  select q.id, org_id, q_ems, 'true'
  from public.org_questions q
  where q.organization_id = org_id
    and q.question_key in ('ems_department', 'ems_responder_id', 'ems_responder_name');

  insert into public.org_question_conditions (
    question_id, organization_id, depends_on_question_id, expected_value
  )
  select q.id, org_id, q_injured, 'true'
  from public.org_questions q
  where q.organization_id = org_id
    and q.question_key in ('injured_party_type', 'transported_to_hospital', 'injury_description');

  insert into public.org_question_conditions (
    question_id, organization_id, depends_on_question_id, expected_value
  )
  select q.id, org_id, q_damage, 'true'
  from public.org_questions q
  where q.organization_id = org_id
    and q.question_key in ('damage_type', 'damage_description', 'estimated_cost');
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------
create function public.create_draft_report(org_id uuid)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  new_report public.reports;
  seq integer;
  writer text;
  addr text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and organization_id = org_id
      and status = 'approved'
  ) then
    raise exception 'Not authorized';
  end if;

  perform public.seed_organization_intake(org_id);

  insert into public.report_number_sequences (organization_id)
  values (org_id)
  on conflict (organization_id) do nothing;

  update public.report_number_sequences
  set last_value = last_value + 1
  where organization_id = org_id
  returning last_value into seq;

  select coalesce(nullif(trim(full_name), ''), email)
    into writer
  from public.users
  where id = auth.uid();

  select address into addr
  from public.organizations
  where id = org_id;

  insert into public.reports (
    organization_id,
    report_number,
    status,
    created_by,
    occurred_at,
    writer_name,
    property_address
  ) values (
    org_id,
    to_char(timezone('utc', now()), 'YYYYMM') || '-' || lpad(seq::text, 4, '0'),
    'draft',
    auth.uid(),
    now(),
    writer,
    addr
  )
  returning * into new_report;

  insert into public.report_agencies (report_id, organization_id, kind)
  values
    (new_report.id, org_id, 'police'),
    (new_report.id, org_id, 'fire'),
    (new_report.id, org_id, 'fire_rescue');

  insert into public.audit_log (
    organization_id, user_id, report_id, action, new_value
  ) values (
    org_id,
    auth.uid(),
    new_report.id,
    'report.created',
    jsonb_build_object('report_number', new_report.report_number)
  );

  return new_report;
end;
$$;

create function public.submit_report(target_report_id uuid, signature_path text)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_report public.reports;
  updated_report public.reports;
  building_required boolean := false;
  summary_required boolean := false;
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

  if not public.can_edit_draft(target_report_id) then
    raise exception 'Not authorized to submit this report';
  end if;

  select coalesce(bool_or(required), false) into building_required
  from public.org_questions
  where organization_id = current_report.organization_id
    and question_key = 'building'
    and is_active;

  select coalesce(bool_or(required), false) into summary_required
  from public.org_questions
  where organization_id = current_report.organization_id
    and question_key = 'original_summary'
    and is_active;

  if current_report.incident_type_id is null then
    raise exception 'Choose an incident type';
  end if;

  if current_report.occurred_at is null then
    raise exception 'Set when this happened';
  end if;

  if building_required and current_report.building_id is null then
    raise exception 'Choose a building';
  end if;

  if summary_required and (
    current_report.original_summary is null
    or length(trim(current_report.original_summary)) = 0
  ) then
    raise exception 'Describe what happened';
  end if;

  perform set_config('app.allow_report_status', 'true', true);

  update public.reports
  set status = 'submitted',
      submitted_at = now(),
      officer_signature_path = trim(signature_path),
      officer_signed_at = now(),
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
    'report.submitted',
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', 'submitted', 'report_number', updated_report.report_number)
  );

  return updated_report;
end;
$$;

create function public.discard_draft_report(target_report_id uuid)
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

  if not public.can_edit_draft(target_report_id) then
    raise exception 'Not authorized to discard this draft';
  end if;

  insert into public.audit_log (
    organization_id, user_id, report_id, action, previous_value
  ) values (
    current_report.organization_id,
    auth.uid(),
    null,
    'report.discarded',
    jsonb_build_object(
      'report_id', current_report.id,
      'report_number', current_report.report_number
    )
  );

  delete from public.reports where id = target_report_id;
end;
$$;

-- Recreate org create so new properties get default intake.
drop function if exists public.create_organization(text, text, text[], text);

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

  perform public.seed_organization_intake(new_org.id);

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

-- Backfill existing organizations created in Phase 1.
do $$
declare
  org_row record;
begin
  for org_row in select id from public.organizations
  loop
    perform public.seed_organization_intake(org_row.id);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.org_incident_types enable row level security;
alter table public.org_questions enable row level security;
alter table public.org_question_options enable row level security;
alter table public.org_question_conditions enable row level security;
alter table public.report_number_sequences enable row level security;
alter table public.reports enable row level security;
alter table public.report_agencies enable row level security;
alter table public.report_vehicles enable row level security;
alter table public.report_people enable row level security;
alter table public.report_property_damage enable row level security;
alter table public.report_answers enable row level security;
alter table public.report_media enable row level security;

revoke all on public.report_number_sequences from anon, authenticated;

create policy "members read incident types"
  on public.org_incident_types for select
  using (public.is_org_member(organization_id));

create policy "members read questions"
  on public.org_questions for select
  using (public.is_org_member(organization_id));

create policy "members read question options"
  on public.org_question_options for select
  using (public.is_org_member(organization_id));

create policy "members read question conditions"
  on public.org_question_conditions for select
  using (public.is_org_member(organization_id));

create policy "members read reports they can access"
  on public.reports for select
  using (public.can_read_report(id));

create policy "authors update own drafts"
  on public.reports for update
  using (public.can_edit_draft(id))
  with check (public.can_edit_draft(id));

create policy "read report agencies"
  on public.report_agencies for select
  using (public.can_read_report(report_id));

create policy "edit draft agencies"
  on public.report_agencies for all
  using (public.can_edit_draft(report_id))
  with check (public.can_edit_draft(report_id));

create policy "read report vehicles"
  on public.report_vehicles for select
  using (public.can_read_report(report_id));

create policy "edit draft vehicles"
  on public.report_vehicles for all
  using (public.can_edit_draft(report_id))
  with check (public.can_edit_draft(report_id));

create policy "read report people"
  on public.report_people for select
  using (public.can_read_report(report_id));

create policy "edit draft people"
  on public.report_people for all
  using (public.can_edit_draft(report_id))
  with check (public.can_edit_draft(report_id));

create policy "read report damage"
  on public.report_property_damage for select
  using (public.can_read_report(report_id));

create policy "edit draft damage"
  on public.report_property_damage for all
  using (public.can_edit_draft(report_id))
  with check (public.can_edit_draft(report_id));

create policy "read report answers"
  on public.report_answers for select
  using (public.can_read_report(report_id));

create policy "edit draft answers"
  on public.report_answers for all
  using (public.can_edit_draft(report_id))
  with check (public.can_edit_draft(report_id));

create policy "read report media"
  on public.report_media for select
  using (public.can_read_report(report_id));

create policy "insert draft media"
  on public.report_media for insert
  with check (public.can_edit_draft(report_id));

create policy "delete draft media"
  on public.report_media for delete
  using (public.can_edit_draft(report_id));

-- -----------------------------------------------------------------------------
-- STORAGE
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('report-media', 'report-media', false, 104857600)
on conflict (id) do nothing;

create policy "read report media objects"
  on storage.objects for select
  using (
    bucket_id = 'report-media'
    and public.can_read_report(((storage.foldername(name))[2])::uuid)
  );

create policy "upload draft media objects"
  on storage.objects for insert
  with check (
    bucket_id = 'report-media'
    and public.can_edit_draft(((storage.foldername(name))[2])::uuid)
  );

create policy "update draft media objects"
  on storage.objects for update
  using (
    bucket_id = 'report-media'
    and public.can_edit_draft(((storage.foldername(name))[2])::uuid)
  );

create policy "delete draft media objects"
  on storage.objects for delete
  using (
    bucket_id = 'report-media'
    and public.can_edit_draft(((storage.foldername(name))[2])::uuid)
  );

grant execute on function public.create_draft_report(uuid) to authenticated;
grant execute on function public.submit_report(uuid, text) to authenticated;
grant execute on function public.discard_draft_report(uuid) to authenticated;
grant execute on function public.can_read_report(uuid) to authenticated;
grant execute on function public.can_edit_draft(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text[], text) to authenticated;
