-- Allow anyone to delete availability rows
-- This is necessary so users can un-vote.
-- In a real auth system, we'd check (participant_id = auth.uid()), but for this anon app, we allow it.
create policy "Allow public deletion of availability"
on availability for delete
using (true);
