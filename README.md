<div align="center">

# 🪢 Penelope

> Self-hosted deployment platform — deploy projects, services, and infrastructure from a single dashboard, on your own infrastructure.

<img alt="frontend" src="https://img.shields.io/badge/frontend-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=1a1b26" />
<img alt="backend" src="https://img.shields.io/badge/backend-coming%20soon-1a1b26?style=for-the-badge&labelColor=1a1b26" />
<img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-0078D4?style=for-the-badge&labelColor=1a1b26" />

</div>

---

## 📌 Overview

**Penelope** is a self-hosted deployment platform. It gives teams a single place to manage projects, services, volumes, and deployments — running on infrastructure they control.

The dashboard is built as a React SPA with a Railway-inspired project-centric model: a **project** groups one or more **services** (web, API, database, worker, …), each with its own lifecycle. Services can be linked to a Git repository across GitHub, GitLab, or Bitbucket, and the UI surfaces the last commit alongside the current service status.

The interface is intentionally dense and keyboard-friendly: collapsible sidebar, resizable project-card grid (compact / default / expanded), live search, and a full light/dark/system theme toggle — all in a ~14px design language that stays readable at information density.

### ⚠️ Current state

Penelope is in **early development**. The current codebase is a fully functional frontend built against mock data. Backend services, a real deployment engine, and persistent state do not exist yet. The UI is production-quality and reflects the target product — the infrastructure layer is what remains.

---

## ⚙️ Architecture

```text
pnpm workspace
       │
       ├── apps/web          React SPA (Vite + TypeScript)
       │     ├── components/   Radix UI primitives + Tailwind
       │     ├── pages/        Route-level components
       │     ├── hooks/        useTheme, …
       │     ├── i18n/         Locale strings (en)
       │     ├── types/        Project / Service / GitProvider
       │     └── lib/          utils, mock-data
       │
       ├── apps/api          Axum + Tokio + sqlx (Postgres)
       │
       └── packages/
             ├── api-types/  Generated OpenAPI TypeScript types
             └── helene/     Isolated @helene/ui component library
```

The dashboard still runs against mock data. The API skeleton in `apps/api` exposes liveness and readiness probes and a deny-by-default auth layer; TypeScript types are generated from the OpenAPI document into `@penelope/api-types`. Helene (`@helene/ui`) is a standalone component library and must not depend on Penelope.

---

## 🔬 Current state

### Dashboard

The dashboard renders a live-filtered grid of projects. Each card shows:

- project name
- per-service status badges (`running` / `building` / `failed` / `sleeping`)
- last deployment time
- linked Git repository and last commit message, when present

Cards are resizable across three density presets (compact, default, expanded). The header search filters projects in real time. A "New project" button opens a dialog to create a project by name. New projects live in memory until the API exists.

### Sidebar

A collapsible left-hand navigation with two groups:

| Group   | Links                                     |
| ------- | ----------------------------------------- |
| General | Projects, Deployments, Volumes, Templates |
| Admin   | Team, Usage, Settings                     |

When collapsed, full labels are replaced by icon-only entries with hover tooltips. The user menu at the bottom exposes a theme switcher (light / dark / system) and a sign-out action.

### Theme

Theme preference is persisted to `localStorage` and applied as a `data-theme` attribute on `<html>`. The system preference is tracked via `prefers-color-scheme` and re-evaluated at mount.

### Accessibility

The layout follows WCAG 2.1 AA targets: landmark roles, skip-to-main link, full keyboard navigation, visible focus rings, `prefers-reduced-motion` support, and `aria-label` coverage on all icon-only controls.

---

## 🎯 Goals

The immediate goal is to wire the existing frontend to a real backend, turning the mock data into live deployment state.

Penelope needs to:

- authenticate users and persist sessions;
- store and manage project and service definitions;
- connect to a container orchestration layer to run services;
- receive Git webhooks and trigger builds;
- stream build and runtime logs to the dashboard;
- surface real-time service status without polling;
- handle volumes, secrets, and environment variables per service;
- enforce team-level access control;
- expose a CLI and/or API for automation.

Longer term, Penelope aims to be a credible self-hosted alternative to Railway, Render, and similar platforms — with no vendor lock-in and no egress costs.

---

## 🗺️ Roadmap

### Frontend

- [x] Project dashboard with live search and resizable card grid
- [x] Per-service status badges
- [x] Git repo + last commit display on project cards
- [x] Collapsible sidebar with keyboard navigation
- [x] Light / dark / system theme with persistence
- [x] WCAG 2.1 AA accessibility pass
- [x] i18n scaffolding (English locale)
- [ ] Project detail page
- [ ] Service log viewer
- [ ] Deployment history timeline
- [x] New project creation dialog
- [ ] New service creation flow
- [ ] In-app settings pages
- [ ] Team management UI
- [ ] Usage and metrics views

### Backend

- [ ] Auth (session-based or token-based)
- [ ] Project and service persistence
- [ ] Container runtime integration
- [ ] Git webhook ingestion and build triggering
- [ ] Log streaming
- [ ] Real-time status via WebSocket or SSE
- [ ] Volume management
- [ ] Secrets and environment variable store

### Platform

- [ ] CLI (`penelope deploy`, `penelope logs`, …)
- [ ] Public REST / GraphQL API
- [ ] Docker Compose and Kubernetes deployment targets
- [ ] One-command self-hosted install
- [ ] Template library

---

## 🧱 Monorepo

Penelope uses **pnpm workspaces**:

```text
Penelope/
├── apps/
│   └── web/                  React SPA
│       ├── src/
│       │   ├── components/   ui/ and dashboard/
│       │   ├── hooks/        useTheme
│       │   ├── i18n/         locale strings
│       │   ├── layouts/      shell layouts
│       │   ├── lib/          utils, mock-data
│       │   ├── pages/        LoginPage, SignupPage, DashboardPage
│       │   └── types/        project.ts
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.ts
│       └── vite.config.ts
│
│   └── api/                  Axum API
│
├── packages/
│   ├── api-types/            @penelope/api-types (generated OpenAPI types)
│   └── helene/               @helene/ui (reusable components)
│
├── Cargo.toml                Rust workspace
├── rust-toolchain.toml
├── docker-compose.yml        Postgres 16 (development)
├── package.json
├── pnpm-workspace.yaml
└── LICENSE
```

---

## 🧪 Development environment

| Component  | Version              |
| ---------- | -------------------- |
| Node.js    | `22.22.2+ or 24.15+` |
| pnpm       | `≥ 10.34`            |
| React      | `18.3`               |
| TypeScript | `5.x`                |
| Vite       | `6.x`                |
| Tailwind   | `3.4`                |

### Getting started

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # start the web app dev server (Vite HMR)
pnpm build            # production build
pnpm typecheck        # TypeScript type-check across all packages
pnpm lint             # ESLint across all packages
pnpm format           # Prettier across apps/**
```

### API

The API is a Rust workspace member (`cargo run -p api`). Copy `.env.example` to `.env` first (that file is gitignored).

```bash
cp .env.example .env             # required: compose reads POSTGRES_PASSWORD from .env
docker compose up -d db          # Postgres 16, bound to 127.0.0.1
cargo run -p api                 # listen on BIND_ADDRESS (default 127.0.0.1:3000)
# GET /healthz  — liveness (no database)
# GET /readyz   — readiness (checks Postgres)
```

Regenerate the OpenAPI document and the TypeScript types after changing API routes or schemas:

```bash
cargo run -p api --bin gen-openapi
pnpm --filter @penelope/api-types generate
```

---

## 🖥️ Compatibility

The dashboard currently targets:

- Modern Chromium, Firefox, and Safari (evergreen)
- Light and dark system themes
- Mouse and keyboard navigation

The platform layer, once built, will target:

- Linux (primary deployment target)
- Docker and OCI-compatible runtimes

---

## 📄 License

Penelope is licensed under the [Apache License 2.0](LICENSE).

You are free to use, modify, and distribute the project under the terms of the Apache-2.0 license.
