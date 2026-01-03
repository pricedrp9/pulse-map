-- Add is_completed column to participants table
ALTER TABLE participants 
ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN participants.is_completed IS 'Tracks if the participant has finished selecting their availability';
