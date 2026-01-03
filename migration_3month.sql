-- Update view_type check constraint to include '3-months'
ALTER TABLE pulses 
DROP CONSTRAINT pulses_view_type_check;

ALTER TABLE pulses
ADD CONSTRAINT pulses_view_type_check 
CHECK (view_type IN ('1-day', '7-day', '14-day', 'month', '3-months'));
