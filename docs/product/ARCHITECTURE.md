# WriteMelo 02 Architecture

WriteMelo 02 is migrating to a modular monolith. Hono owns the Cloudflare Worker HTTP entry point while existing behavior remains behind one explicit legacy adapter. Routes can therefore move one bounded module at a time without rewriting the product.

## Runtime

```text
React/Vite web application (planned)
              |
              v
Hono HTTP entry: apps/worker/src
              |
       +------+------+
       |             |
new module routes    legacy adapter
       |             |
       +------+------+
              |
application and domain modules (migration target)
              |
       +------+------------------+
       |             |           |
      D1       Durable Objects   model providers
```

The deployed entry is `apps/worker/src/index.ts`. The current `worker.js` is still the tested legacy implementation and must not gain new product domains. New HTTP routes belong under `apps/worker/src/routes`.

## Boundaries

- `apps/worker`: HTTP routing, middleware, response formatting, and dependency assembly.
- `packages/domain` (planned): account, usage, billing, referral, provider, support, and risk rules without HTTP or SQL.
- `packages/database` (planned): D1 schemas and repositories.
- `packages/contracts` (planned): shared request and response schemas.
- `public`: current browser application. A component migration is intentionally deferred.
- `worker.js` and `src/cloud`: compatibility implementation that shrinks as modules migrate.

HTTP handlers must not become the source of business rules. Domain code must not import Hono, D1, Microsoft Store, or provider SDKs. Infrastructure adapters implement interfaces defined by the application or domain layer.

## Migration Sequence

1. Establish the Hono entry, TypeScript checking, a health route, and the legacy boundary.
2. Move authentication and session routes behind an account application service.
3. Replace split monthly and grant deductions with one usage ledger and reserve/commit/release flow.
4. Move provider selection, health, budgets, and failover into a provider router.
5. Move Store verification and referral qualification into billing and referral modules.
6. Move support and risk APIs, then reduce `worker.js` to zero application behavior.
7. Migrate browser pages to React/Vite only after the API contracts stabilize.

Every step must preserve existing tests, add tests for the migrated boundary, and remain deployable.

## Commands

```powershell
npm run typecheck
npm run build:worker
npm test
npm run privacy
```

`GET /api/health` is owned by Hono and reports the architecture, environment, market, and request ID without exposing secrets.
