-- Prisma's schema language has no native PostGIS geography type. The restaurants.location
-- field is modeled as Unsupported("geography(Point,4326)"), which excludes it from
-- Prisma Client's typed query builder, so all spatial reads and writes must use
-- prisma.$queryRaw or prisma.$executeRaw.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX restaurants_location_gist_idx ON restaurants USING GIST (location);
