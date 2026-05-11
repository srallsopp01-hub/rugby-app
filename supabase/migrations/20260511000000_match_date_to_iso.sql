-- Convert saved_matches.match_date from DD/MM/YYYY text to ISO date.
-- Run on a Supabase branch first, spot-check the results, then apply to prod.
--
-- IMPORTANT: Any existing code that does string-shaped reads on match_date
-- (e.g. split('/'), regex for \d{2}/\d{2}/\d{4}) will need updating before
-- this migration is applied to production. See the companion code changes.

begin;

-- 1. Add a working column.
alter table public.saved_matches
  add column if not exists match_date_iso date;

-- 2. Populate it from DD/MM/YYYY rows only (safe: non-matching rows stay NULL).
update public.saved_matches
set match_date_iso = to_date(match_date, 'DD/MM/YYYY')
where match_date ~ '^\d{1,2}/\d{1,2}/\d{4}$';

-- 3. Spot-check before committing:
--    select match_date, match_date_iso from public.saved_matches limit 20;

-- 4. Drop the old column, promote the new one.
alter table public.saved_matches drop column match_date;
alter table public.saved_matches rename column match_date_iso to match_date;

-- 5. Add a comment so future maintainers know the canonical format.
comment on column public.saved_matches.match_date is
  'ISO date (YYYY-MM-DD). Display as DD/MM/YYYY at the UI layer.';

commit;
