create table if not exists public.ticket_collection (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_code text not null,
  ticket_no text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, team_code, ticket_no)
);

alter table public.ticket_collection enable row level security;

drop policy if exists "Users can read their own tickets" on public.ticket_collection;
create policy "Users can read their own tickets"
on public.ticket_collection
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own tickets" on public.ticket_collection;
create policy "Users can insert their own tickets"
on public.ticket_collection
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tickets" on public.ticket_collection;
create policy "Users can update their own tickets"
on public.ticket_collection
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tickets" on public.ticket_collection;
create policy "Users can delete their own tickets"
on public.ticket_collection
for delete
to authenticated
using (auth.uid() = user_id);
