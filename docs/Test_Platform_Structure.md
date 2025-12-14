# Phase II Test Platform Structure

This document explains how automated testing is organized in `hptourism-stg-rc3` starting with Phase II.

## Tooling Overview

| Layer       | Frameworks / Packages                                   | Notes |
|-------------|----------------------------------------------------------|-------|
| Unit/Integration (API + Shared) | [Vitest](https://vitest.dev), Supertest (for future HTTP route tests) | Runs in Node environment except for client components. |
| Component/UI (React) | Vitest + `@testing-library/react` + `@testing-library/jest-dom` + jsdom | Mirrors the existing Vite/React setup. |
| E2E | Playwright (`@playwright/test`) | Uses `E2E_BASE_URL` (default `http://localhost:5173`). Basic smokes live in `tests/e2e/`. |

## Key Files

- `vitest.config.ts`: central config; defaults to `jsdom` with a per-folder override so `server/**` and `shared/**` tests still run under Node. Enables coverage via V8 and sets up TS path aliases.
- `tsconfig.vitest.json`: Vitest-specific type context (adds `vitest/globals`, `node`, `vite/client`).
- `vitest.setup.ts`: global hooks. Seeds minimal env vars (`NODE_ENV`, `DATABASE_URL`, `SESSION_SECRET`) so `shared/config` validation passes when tests import backend modules. Also imports `@testing-library/jest-dom/vitest` so DOM matchers work globally.
- `client/src/components/ui/button.test.tsx`: example UI test showing Testing Library usage.
- `server/himkosh/gatewayConfig.test.ts`: example backend test validating helper behavior without hitting external services.

## npm Scripts

```bash
npm run test       # Executes the entire Vitest suite once
npm run test:watch # Interactive watch mode for local development
npm run test:e2e   # Playwright smokes (requires running app + E2E_BASE_URL)
npm run test:all   # Runs unit + e2e
```

These replace ad-hoc testing; integrate them into CI/CD once the route refactor stabilizes.

## Writing Tests

1. **API / Shared Modules**
   - Place under the same directory as the module (`*.test.ts`).
   - Use Vitest `describe/it` and import helpers directly.
   - For Express routes, instantiate the router and use Supertest (to be added during modularization).
2. **React Components**
   - Store tests near the component (`*.test.tsx`).
   - Use Testing Library `render`, `screen`, and user-event for interactions.
   - Prefer visible text/role selectors to mimic real usage.
3. **Environment-sensitive Modules**
   - If a module requires env vars, add defaults in `vitest.setup.ts` or mock via `vi.stubEnv` within the test to keep suites deterministic.

## Future Enhancements

- Add Supertest-powered API route coverage once `server/routes.ts` is modularized.
- Introduce snapshot/visual regression for critical admin dashboards.
- Expand Playwright coverage: owner submission → DA scrutiny → DTDO approval → HimKosh payment launch.
- Wire `npm run test:all` into build pipelines and PM2 smoke jobs.

This structure gives us a consistent foundation to validate Phase II refactors and future features without manual, error-prone verification.
