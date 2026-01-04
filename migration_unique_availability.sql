-- 1. Remove duplicate rows, keeping the one with the latest created_at
-- (Though ideally they are identical, we just need to keep one)
DELETE FROM availability a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (participant_id, pulse_id, start_time) id
    FROM availability
    ORDER BY participant_id, pulse_id, start_time, created_at DESC
);

-- 2. Add Unique Index/Constraint
CREATE UNIQUE INDEX idx_unique_availability 
ON availability (participant_id, pulse_id, start_time);

-- Optional: Explicit constraint (backed by the index)
ALTER TABLE availability 
ADD CONSTRAINT unique_availability_slot 
UNIQUE USING INDEX idx_unique_availability;
