-- Kaap Phase 2 — accounts (SPEC §5.1, §6.2): profiles + synced saves.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  interests  text[] not null default '{}',
  home_area  area_id,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row on signup, seeded from the signup metadata the
-- client passes (name + interests collected during onboarding/guest mode).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, interests)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(
      (select array_agg(x)
         from jsonb_array_elements_text(
                coalesce(new.raw_user_meta_data -> 'interests', '[]'::jsonb)
              ) as t(x)),
      '{}'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.saves (
  user_id    uuid not null references auth.users (id) on delete cascade,
  spot_id    text not null references public.spots (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

alter table public.saves enable row level security;

create policy "read own saves" on public.saves
  for select using (auth.uid() = user_id);
create policy "insert own saves" on public.saves
  for insert with check (auth.uid() = user_id);
create policy "delete own saves" on public.saves
  for delete using (auth.uid() = user_id);

-- RLS governs rows; these table-level grants are also required for the API roles.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.saves to authenticated;
