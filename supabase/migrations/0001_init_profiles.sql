-- Stage 0: minimal profiles table, one row per auth.users row.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid () = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid () = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user ();
