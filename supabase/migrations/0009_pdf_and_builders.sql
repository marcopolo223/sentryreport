-- SentryReport v2 — Phase 5
-- PDF templates, admin writes for intake questions.

create table public.pdf_templates (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  layout jsonb not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pdf_templates enable row level security;

create policy "members read pdf template"
  on public.pdf_templates for select
  using (public.is_org_member(organization_id));

create policy "admins write pdf template"
  on public.pdf_templates for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "admins write incident types"
  on public.org_incident_types for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "admins write questions"
  on public.org_questions for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "admins write question options"
  on public.org_question_options for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "admins write question conditions"
  on public.org_question_conditions for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
