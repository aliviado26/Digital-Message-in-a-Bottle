-- explorable_bottles should only surface real user bottles, not the
-- Stage 1 internal test harness's is_test bottles from /ocean.
create or replace view public.explorable_bottles as
select
  id,
  status,
  lat,
  lng,
  distance_km,
  released_at,
  origin_shore_id,
  landed_shore_id
from public.bottles
where status in ('drifting', 'stranded')
  and is_test = false;
