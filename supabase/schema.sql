-- GoNai/PaiNai — Supabase schema
-- รันใน Supabase SQL Editor เพื่อสร้างตารางทั้งหมด
-- อ้างอิง: lib/types.ts (data model)
-- ที่มา: spec 2.1 (Supabase migration target)

-- ===== Extensions =====
create extension if not exists "uuid-ossp";

-- ===== users =====
create table if not exists public.users (
  id text primary key,                       -- device id หรือ LINE user id
  created_at timestamptz not null default now(),
  budget_defaults jsonb not null default '{}'::jsonb,  -- Partial<Record<Intent, number>>
  taste jsonb not null default '{}'::jsonb            -- Record<string, number>
);

-- ===== plans =====
create table if not exists public.plans (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  intent text not null check (intent in ('work','date','family','photo')),
  origin_zone text not null,
  status text not null default 'draft' check (status in ('draft','active','done')),
  route_kind text not null default 'cheapest' check (route_kind in ('cheapest','fastest')),
  budget_planned integer not null check (budget_planned > 0),
  budget_actual integer,
  stops jsonb not null default '[]'::jsonb,   -- PlanStop[]
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_user_id on public.plans(user_id);
create index if not exists idx_plans_status on public.plans(status);

-- ===== saves =====
create table if not exists public.saves (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  venue_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, venue_id)
);

create index if not exists idx_saves_user_id on public.saves(user_id);

-- ===== events (fire-and-forget tracking) =====
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_user_id on public.events(user_id);
create index if not exists idx_events_type on public.events(type);

-- ===== imports (TikTok/IG link queue) =====
create table if not exists public.imports (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  url text not null,
  platform text not null check (platform in ('tiktok','ig')),
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_imports_status on public.imports(status);

-- ===== waitlist =====
create table if not exists public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  contact text not null,
  channel text not null,
  source text,
  pdpa_consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===== Row Level Security =====
-- ผู้ใช้เห็น/แก้ได้แค่ข้อมูลตัวเอง (ผ่าน user_id จาก auth)
-- หมายเหตุ: ใน dev ใช้ anon key ผ่าน x-gn-user header → ต้องตั้ง RLS policy ให้ผ่าน

alter table public.users enable row level security;
alter table public.plans enable row level security;
alter table public.saves enable row level security;
alter table public.events enable row level security;
alter table public.imports enable row level security;

-- Policy: ผู้ใช้จัดการข้อมูลตัวเองได้ทั้งหมด
-- (ใน production ใช้ auth.uid() = LINE user id)
-- (ใน dev ผ่าน service_role key ข้าม RLS ได้)

create policy "users_self" on public.users
  for all using (id = current_setting('app.user_id', true))
  with check (id = current_setting('app.user_id', true));

create policy "plans_self" on public.plans
  for all using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

create policy "saves_self" on public.saves
  for all using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

create policy "events_self" on public.events
  for all using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

create policy "imports_self" on public.imports
  for all using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

-- ===== Updated trigger =====
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;