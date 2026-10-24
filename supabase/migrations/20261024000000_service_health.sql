create table if not exists public.service_health (
  service text primary key,
  ok boolean not null,
  detail text not null default '',
  checked_at timestamptz not null default now()
);

alter table public.service_health enable row level security;
-- No policies: only the service role (edge functions) reads and writes this table.
