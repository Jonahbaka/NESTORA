ALTER TABLE audit_events
  ALTER COLUMN actor_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS audit_events_actor_id_fkey,
  ADD CONSTRAINT audit_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE moderation_actions
  ALTER COLUMN actor_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS moderation_actions_actor_id_fkey,
  ADD CONSTRAINT moderation_actions_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hotel_room_types
  DROP CONSTRAINT IF EXISTS hotel_room_types_listing_id_fkey,
  ADD CONSTRAINT hotel_room_types_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE hotel_rooms
  DROP CONSTRAINT IF EXISTS hotel_rooms_room_type_id_fkey,
  ADD CONSTRAINT hotel_rooms_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES hotel_room_types(id) ON DELETE CASCADE;

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_room_id_fkey,
  ADD CONSTRAINT reservations_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES hotel_rooms(id) ON DELETE CASCADE;
