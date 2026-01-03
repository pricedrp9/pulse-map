-- Add start_date column to pulses table
ALTER TABLE pulses ADD COLUMN start_date timestamptz DEFAULT now();
