-- Rename set piece side value from "Easts" to "Own" in all stored match payloads.
-- This makes the value team-agnostic so all clubs store their own-ball events
-- consistently, regardless of team name.
-- The app's backward-compat filter (=== "Own" || === "Easts") means this
-- migration can run at any time without a coordinated deploy.

update public.saved_matches
set payload = jsonb_set(
  payload,
  '{events}',
  (
    select coalesce(jsonb_agg(
      case
        when event->>'setPieceSide' = 'Easts'
        then event || '{"setPieceSide":"Own"}'::jsonb
        else event
      end
    ), '[]'::jsonb)
    from jsonb_array_elements(payload->'events') as event
  )
)
where payload->'events' @> '[{"setPieceSide":"Easts"}]'::jsonb;
