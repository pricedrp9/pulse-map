-- Add mode column to pulses table
ALTER TABLE pulses 
ADD COLUMN mode text DEFAULT 'times' CHECK (mode IN ('times', 'dates'));
