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
  platform text not null check (platform in ('tiktok','ig','youtube')),
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_imports_status on public.imports(status);

-- ===== Catalog: zones / venues / routes =====
-- content ของแอป — ทีม field ops แก้ใน dashboard ได้เลย ไม่ต้อง deploy โค้ด
-- seed ครั้งแรก: npx tsx supabase/seed.ts (fixtures) หรือ --w2 (mock 40 venues)

create table if not exists public.zones (
  id text primary key,
  name_th text not null,
  is_origin boolean not null default true,
  km_to_siam numeric not null default 0
);

create table if not exists public.venues (
  id text primary key,
  name_th text not null,
  zone_id text not null references public.zones(id),
  category text not null check (category in ('cafe','restaurant','activity','market')),
  intents text[] not null default '{}',
  badge text not null check (badge in ('hit','unseen')),
  hit_rank integer,
  unseen_rank integer,
  transition_rank integer,
  attributes jsonb not null default '{}'::jsonb,   -- VenueAttributes
  price_per_head_min integer not null,
  price_per_head_max integer not null,
  open_time text not null,                          -- "09:00"
  close_time text not null,                         -- "21:00"
  walk_min_from_hub integer not null default 0,
  video_url text,
  source text not null default 'sprint' check (source in ('sprint','tat','import')),
  last_validated_at date not null,                  -- stale check: เก่ากว่า 45 วัน → revalidate
  validation_count integer not null default 0       -- unseen โชว์เมื่อ ≥ 3 (spec 2.6)
);

create index if not exists idx_venues_zone on public.venues(zone_id);
create index if not exists idx_venues_badge on public.venues(badge);

create table if not exists public.routes (
  id text primary key,
  origin_zone text not null references public.zones(id),
  dest_zone text not null references public.zones(id),
  kind text not null check (kind in ('cheapest','fastest')),
  legs jsonb not null default '[]'::jsonb           -- RouteLeg[]
);

create index if not exists idx_routes_origin on public.routes(origin_zone);

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
alter table public.waitlist enable row level security;
-- catalog: เปิด RLS ไว้โดยไม่มี policy = anon key อ่าน/เขียนไม่ได้เลย
-- (server ใช้ service key ซึ่งข้าม RLS — client ไม่แตะ Supabase ตรง)
alter table public.zones enable row level security;
alter table public.venues enable row level security;
alter table public.routes enable row level security;

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