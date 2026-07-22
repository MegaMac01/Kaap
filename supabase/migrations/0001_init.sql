-- Kaap schema: Phase 1 (SPEC §6).
-- Apply in the Supabase SQL editor (or `supabase db push`), then run seed.sql.

create type category as enum ('eat', 'bars', 'outdoor', 'classes', 'chill', 'arts', 'family');

create type area_id as enum (
  'waterfront', 'bokaap', 'citybowl', 'seapoint', 'campsbay', 'tablemtn',
  'woodstock', 'obs', 'south', 'constantia', 'houtbay', 'muizenberg'
);

create table public.spots (
  id             text primary key,                 -- stable slug, e.g. 'truth'
  name           text not null,
  category       category not null,
  area           area_id not null,
  lat            double precision,
  lng            double precision,
  price_band     smallint not null check (price_band between 0 and 3),
  price_estimate text not null,
  blurb          text not null,
  tags           text[] not null default '{}',
  -- {"mon":[{"open":"07:00","close":"18:00"}], ...}; [] = closed; 00:00–24:00 = always open
  hours          jsonb not null,
  address        text,
  phone          text,
  website        text,                             -- TODO: Places API enrichment (SPEC §7)
  booking_url    text,
  photos         text[] not null default '{}',     -- TODO: hosted images (SPEC §7)
  rating         numeric(2,1),                     -- TODO: provider ratings (SPEC §6.4)
  review_count   integer,
  sort_order     integer not null default 0,       -- curated "Recommended" order
  updated_at     timestamptz not null default now()
);

create table public.collections (
  key         text primary key,
  label       text not null,
  description text not null,
  icon        text not null,
  palette_key text not null,
  -- null = static member list in collection_spots; 'free' = all price_band 0
  rule        text,
  sort_order  integer not null default 0
);

create table public.collection_spots (
  collection_key text not null references public.collections (key) on delete cascade,
  spot_id        text not null references public.spots (id) on delete cascade,
  position       integer not null default 0,
  primary key (collection_key, spot_id)
);

-- Phase 1 is read-only public data; writes happen via the service role
-- (admin tool, SPEC §7). P2 adds users/saves, P3 adds reviews (SPEC §6.2).
alter table public.spots enable row level security;
alter table public.collections enable row level security;
alter table public.collection_spots enable row level security;

create policy "public read spots" on public.spots for select using (true);
create policy "public read collections" on public.collections for select using (true);
create policy "public read collection_spots" on public.collection_spots for select using (true);

-- RLS governs rows; these table-level grants are also required for the API roles.
grant select on public.spots to anon, authenticated;
grant select on public.collections to anon, authenticated;
grant select on public.collection_spots to anon, authenticated;
