-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Pulses Table
create table pulses (
  id uuid primary key default uuid_generate_v4(),
  organizer_id text not null, -- Device ID or simple auth ID
  title text,
  view_type text check (view_type in ('7-day', '14-day', 'month')) not null,
  status text check (status in ('active', 'confirmed')) default 'active',
  finalized_start timestamptz,
  finalized_end timestamptz,
  timezone text not null,
  created_at timestamptz default now()
);

-- Participants Table
create table participants (
  id uuid primary key default uuid_generate_v4(),
  pulse_id uuid references pulses(id) on delete cascade not null,
  name text not null,
  is_organizer boolean default false,
  timezone text not null, -- Their local timezone
  created_at timestamptz default now()
);

-- Availability Table
create table availability (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references participants(id) on delete cascade not null,
  pulse_id uuid references pulses(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

-- Realtime subscriptions
alter publication supabase_realtime add table pulses;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table availability;

-- Indexes for performance
create index idx_participants_pulse_id on participants(pulse_id);
create index idx_availability_pulse_id on availability(pulse_id);
create index idx_availability_participant_id on availability(participant_id);
