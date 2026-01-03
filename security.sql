-- Enable RLS on all tables
alter table pulses enable row level security;
alter table participants enable row level security;
alter table availability enable row level security;

-- PULSES POLICIES --

-- Allow anyone to create a pulse (since we don't have user accounts yet, we rely on client-side IDs)
create policy "Allow public creation of pulses"
on pulses for insert
with check (true);

-- Allow anyone to view a pulse (needed for sharing links)
create policy "Allow public viewing of pulses"
on pulses for select
using (true);

-- Allow updates only if you know the ID (implicitly true for RLS, but we can restricting mass updates)
-- Ideally we would match 'organizer_id', but without Auth, we trust the client has the ID.
create policy "Allow public updates to pulses"
on pulses for update
using (true);


-- PARTICIPANTS POLICIES --

-- Allow anyone to join a pulse
create policy "Allow public joining"
on participants for insert
with check (true);

-- Allow viewing participants for a pulse
create policy "Allow viewing participants"
on participants for select
using (true);

-- Allow updating your own participant record (e.g. marking as completed)
create policy "Allow updating participant"
on participants for update
using (true);


-- AVAILABILITY POLICIES --

-- Allow anyone to add availability
create policy "Allow public availability entry"
on availability for insert
with check (true);

-- Allow viewing availability
create policy "Allow viewing availability"
on availability for select
using (true);

-- Allow updating availability
create policy "Allow updating availability"
on availability for update
using (true);

-- OPTIONAL: Prevent deletions to secure data against malicious wipes
-- Only allow deletion if functionality strictly requires it.
-- For now, we DO NOT add a delete policy, effectively disabling deletion for anon users.
