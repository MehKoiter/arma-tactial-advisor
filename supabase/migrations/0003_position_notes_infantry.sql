-- Allow INFANTRY as a valid vehicle_type for position notes.
alter table public.position_notes
  drop constraint if exists position_notes_vehicle_type_check;

alter table public.position_notes
  add constraint position_notes_vehicle_type_check
  check (vehicle_type in ('LAV', 'ATTACK_HELO', 'TRANSPORT_HELO', 'INFANTRY'));
