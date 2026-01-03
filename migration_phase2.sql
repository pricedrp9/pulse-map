-- Add email column to participants table
ALTER TABLE participants 
ADD COLUMN email TEXT;

COMMENT ON COLUMN participants.email IS 'Optional email for notifications';
