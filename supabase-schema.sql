create table if not exists public.stock_sessions (
  id uuid primary key,
  session_name text not null default '',
  location_name text not null default '',
  counted_by text not null default '',
  count_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_items (
  id uuid primary key,
  session_id uuid not null references public.stock_sessions(id) on delete cascade,
  kode_produksi text not null default '',
  product text not null default '',
  party text not null default '',
  yard numeric,
  notes text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists stock_items_session_sort_idx
  on public.stock_items (session_id, sort_order);

alter table public.stock_sessions enable row level security;
alter table public.stock_items enable row level security;

create policy "Public stock sessions read"
  on public.stock_sessions for select
  using (true);

create policy "Public stock sessions write"
  on public.stock_sessions for all
  using (true)
  with check (true);

create policy "Public stock items read"
  on public.stock_items for select
  using (true);

create policy "Public stock items write"
  on public.stock_items for all
  using (true)
  with check (true);
