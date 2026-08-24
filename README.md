# BookRestro

Production-grade restaurant discovery and table-booking platform.

## Phase 1 Setup

Prerequisites:

- Node.js 22
- pnpm 9
- Docker Desktop

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm --filter @bookrestro/server prisma:migrate
pnpm --filter @bookrestro/server prisma:seed
pnpm --filter @bookrestro/server test
pnpm --filter @bookrestro/server db:explain
```

The `restaurants.location` column is a PostGIS `geography(Point,4326)` field.
Prisma models it as `Unsupported(...)`, so spatial writes use `prisma.$executeRaw`
and nearby reads should use `prisma.$queryRaw`.
