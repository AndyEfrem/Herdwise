# Herdwise

A livestock management and investor portal for cattle farm administrators to track their herd, manage investor relationships, and monitor animal health treatments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/herdwise run dev` — run the frontend (port 24291)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter routing, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle schema: `investors.ts`, `cattle.ts`, `treatments.ts`
- `artifacts/api-server/src/routes/` — Express route handlers per domain
- `artifacts/herdwise/src/` — React frontend (pages in `src/pages/`)

## Architecture decisions

- Contract-first: OpenAPI spec gates codegen which gates the frontend — change spec first, then run codegen, then update routes/frontend
- `investorName` is denormalized on the Animal response via a LEFT JOIN (not a separate fetch) for performance
- Dashboard summary endpoint computes all stats in a single request rather than multiple roundtrips
- `date` columns (scheduledDate) use `{ mode: "string" }` to preserve calendar days without timezone shifting

## Product

- **Overview** — dashboard with herd stats, status breakdown chart, upcoming care feed
- **Cattle** — full CRUD for individual animals with tag, breed, status, weight, investor assignment
- **Investors** — manage investors with cattle count view
- **Treatments** — schedule and track health treatments per animal
- **Reports / Settings** — placeholder pages

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking `artifacts/api-server` — stale lib declarations cause TS2305 errors
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before touching routes or frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
