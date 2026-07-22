-- Kaap — self-serve account deletion (POPIA right to erasure, SPEC §11).
-- Deleting the auth user cascades to public.profiles and public.saves via
-- the on delete cascade FKs from 0002.

create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
