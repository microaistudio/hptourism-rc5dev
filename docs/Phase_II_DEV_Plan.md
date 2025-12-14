# Phase II Development Plan

Living roadmap for the next engineering cycle. Update this document as new requirements surface or priorities shift.

## 1. Refactor `routes.ts`
**Goal**: Break the Express monolith into maintainable feature routers without changing public APIs.

- **Scope**: carve out self-contained routers for Auth, Admin, HimKosh, Payments, Applications, Communications, Utilities. Each router owns its middleware, validation, and controllers.
- **Deliverables**:
  - Wiring file that only aggregates routers.
  - Smoke tests covering happy-path requests for every module before/after refactor.
  - Updated developer guide explaining how to add new endpoints post-refactor.
- **Dependencies**: shared helpers (auth, db clients) must move to neutral locations before slicing routes.

## 2. Client & Server Code Restructure
**Goal**: Align both stacks to a clear, domain-first structure so teams can work in parallel without collisions.

- **Server workstream**:
  - `src/server/{routes,controllers,services,workers}` layout with barrel exports.
  - Explicit dependency flow (controllers -> services -> repositories) enforced via lint rules.
- **Client workstream**:
  - Feature folders (e.g., `features/himkosh`, `features/applications`, `features/dashboards`).
  - Shared UI kit + hooks (forms, tables, notifications) extracted into `ui/`.
- **Deliverables**: Architecture diagram + README updates + DX checklist (how to add feature, where tests live).

## 3. UI Refactoring
**Goal**: Give every screen consistent information architecture and reusable components so new modules inherit proven UX.

- Build a `DashboardCard` + `MetricPill` component set for admin consoles.
- Normalize typography, spacing, and icon usage through a tokens file (Tailwind config + CSS vars).
- Introduce storybook-style playground (even a simple `/sandbox`) to iterate safely before merging.
- Deliver wireframes/checklists for priority pages (Landing, DA Dashboard, Owner Portal) to drive implementation order.

## 4. Testing Framework Integration
**Goal**: lock in automated confidence for every release, from unit logic to E2E flows.

- **Server**: Jest + Supertest baseline suite; seed DB via test containers; CI target 70% critical-path coverage.
- **Client**: Vitest + React Testing Library for components; snapshot critical UI states.
- **E2E**: Playwright smoke covering owner registration, payment, HimKosh callback, admin approval.
- **Tooling**: npm scripts + GitHub Action (or existing CI) to run lint → unit → E2E gates; document how to run locally.

---

_Add additional initiatives here as new ideas and requirements emerge._
