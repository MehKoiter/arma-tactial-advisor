-- Per-vehicle position note heatmaps.
-- Notes remain visible to everyone in the room, but the heatmap rendered on
-- the map filters to notes that match the currently selected vehicle.
-- Existing rows are backfilled to 'LAV' (the original/default vehicle).

alter table public.position_notes
  add column if not exists vehicle_type text not null default 'LAV';

-- Backfill any pre-existing nulls just in case (default handles new rows).
update public.position_notes
  set vehicle_type = 'LAV'
  where vehicle_type is null;

-- Constrain to known vehicle types. Drop+recreate so re-running stays idempotent.
alter table public.position_notes
  drop constraint if exists position_notes_vehicle_type_check;

alter table public.position_notes
  add constraint position_notes_vehicle_type_check
  check (vehicle_type in ('LAV', 'ATTACK_HELO', 'TRANSPORT_HELO'));

create index if not exists position_notes_room_vehicle_idx
  on public.position_notes (room_id, vehicle_type);
