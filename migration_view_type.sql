-- Run this in your Supabase SQL Editor to allow the "1-day" view option
ALTER TABLE pulses DROP CONSTRAINT IF EXISTS pulses_view_type_check;
ALTER TABLE pulses ADD CONSTRAINT pulses_view_type_check CHECK (view_type IN ('1-day', '7-day', '14-day', 'month'));
