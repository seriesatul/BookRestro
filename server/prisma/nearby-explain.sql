EXPLAIN ANALYZE
SELECT
  id,
  name,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography) AS distance_meters
FROM restaurants
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography, 50000)
ORDER BY distance_meters
LIMIT 20;
