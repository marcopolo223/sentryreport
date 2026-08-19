-- Drop unused admin header fields from reports.

alter table public.reports
  drop column if exists dispatch_number,
  drop column if exists number_1096,
  drop column if exists number_1097,
  drop column if exists complainant_name,
  drop column if exists complainant_phone;
