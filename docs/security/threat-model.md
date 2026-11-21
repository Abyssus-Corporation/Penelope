# Penelope threat model (initial)

Status: initial version, Phase 0. Owner: Kai (AppSec). Last update: 2026-11-21.

This document tracks what Penelope protects, where the trust boundaries are, and which controls land
in which roadmap phase. It must be updated before Phase 2 (builds and execution) starts, and whenever
the decisions below change.

## Decisions this model is based on

| Decision    | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Tenancy     | **Single-tenant**: all deployed code is trusted and owned by the operator |
| Backend     | Rust (Axum, Tokio, sqlx) with Postgres; a Rust worker drives Docker       |
| Builds      | Nixpacks or Dockerfile, on rootless BuildKit, no access to `docker.sock`  |
| Proxy       | Caddy with automatic TLS                                                  |
| Front       | React + Vite (`apps/web`), TypeScript types generated from the API        |
| Deployments | Self-hosted, single machine first; Kubernetes only on demand              |

See [`SECURITY.md`](../../SECURITY.md) for the public statement of the trust model.

## Current state (commit `6464611`)

- Only the frontend exists (`apps/web`), with mock data. There is no API, database, auth, builder,
  runtime, proxy, CI or tests yet.
- No secrets found in the tree or in git history. `pnpm audit`: 0 known vulnerabilities across 342
  packages on 2026-11-21.
- Hygiene items found during recon, tracked in Phase 0:
  - No CI, branch protection, Dependabot or CodeQL.
  - `.npmrc` sets `enable-pre-post-scripts=true` and `ignore-scripts=false`. Today, dependency build
    scripts are limited by the `allowBuilds` allowlist in `pnpm-workspace.yaml` (only `esbuild`).
  - `pnpm typecheck` runs `tsc --noEmit` against a solution-style `tsconfig.json` (`"files": []`), so
    it checks nothing.
  - Dashboard fonts (Inter Variable, Newsreader Variable, Obel Mono) are self-hosted. A strict CSP
    is applied by `vite preview` and the reference `deploy/Caddyfile` (`font-src 'self'`, Trusted
    Types enforced with `require-trusted-types-for 'script'` and `trusted-types 'none'`). The Vite
    dev server does not set a CSP, so HMR keeps working.
  - `/dashboard` has no route guard. That is UX only; real authorization must live in the API.
  - Project names are validated only on the client. Once a name becomes a container, network or DNS
    label, the API must validate it again (RFC 1123: `[a-z0-9-]`, max 63, unique in the database).

## Assets

| Asset                                         | Why it matters                                       |
| --------------------------------------------- | ---------------------------------------------------- |
| Host and Docker Engine                        | Access to the Docker API is root on the host         |
| Platform Postgres (users, sessions, projects) | Full control of the installation                     |
| User environment variables and secrets        | Credentials to the operator's databases and services |
| Git credentials (OAuth tokens, deploy keys)   | Read and possibly write access to source code        |
| Webhook signing secrets                       | Forged deploys                                       |
| Source code, build cache and images           | Integrity of what runs in production                 |
| Caddy config, TLS keys and ACME account       | Traffic interception, domain hijack                  |
| Dashboard sessions and API tokens             | Act as an operator                                   |
| Backups and volumes                           | Data at rest outside the main database               |
| This repository, CI and release artifacts     | Supply chain for every installation                  |

## Trust boundaries

```
Internet ──► Caddy ──► Dashboard / API (Rust) ──► Postgres
                │              │
                │              └──► Worker (Rust) ──► Docker Engine ──► BuildKit (rootless)
                │                                           │
                └──────────────► User services (containers) ◄┘
```

1. **Internet → Caddy → dashboard/API.** Unauthenticated attackers.
2. **Operator → platform.** Authenticated operators. In single-tenant mode every operator is trusted
   with the whole installation, but authorization is still enforced per endpoint so that the model
   can grow (roles, teams) without a rewrite.
3. **API → worker → Docker Engine.** The most privileged path. A compromised API or worker is a
   compromised host.
4. **Build sandbox.** Builds run code from the repository (build scripts, Dockerfile `RUN`, Nixpacks
   plans). Trusted by policy, isolated anyway as defense in depth.
5. **User services → host and internal network.** Containers can reach the network, the Docker
   bridge and possibly cloud metadata.
6. **Server-side outbound requests.** Git clones, webhooks, health checks, image pulls and ACME.
7. **Supply chain.** npm and crates.io dependencies, base images, GitHub Actions and the installer.

## Threats and controls

| #   | Boundary         | Threat                                                                               | Control                                                                                                                                                                                                                                                                                                          | Phase |
| --- | ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T1  | Internet → API   | Credential stuffing, brute force on login                                            | Argon2id password hashing, rate limit and lockout on login, generic errors                                                                                                                                                                                                                                       | 1     |
| T2  | Internet → API   | Session theft, CSRF                                                                  | Session cookie `HttpOnly`, `Secure`, `SameSite=Lax` or stricter, `__Host-` prefix, CSRF token on state changes, strict CORS (no wildcard with credentials)                                                                                                                                                       | 1     |
| T3  | Operator → API   | Missing authorization on an endpoint (BOLA/IDOR)                                     | Deny-by-default Axum middleware, ownership check per resource, negative authorization test for every route                                                                                                                                                                                                       | 0–1   |
| T4  | Operator → API   | Injection, mass assignment                                                           | sqlx with bound parameters only (no string-built SQL), typed request structs with `deny_unknown_fields`, server-side validation                                                                                                                                                                                  | 1     |
| T5  | Dashboard        | XSS, clickjacking                                                                    | React escaping, no `dangerouslySetInnerHTML`, strict CSP with enforced Trusted Types (`require-trusted-types-for 'script'`; `trusted-types 'none'`), `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy`, set in Caddy. `style-src 'unsafe-inline'`: see [Other accepted risks](#other-accepted-risks). | 0     |
| T6  | Dashboard        | Untrusted build or app logs rendered in the UI (HTML or ANSI injection)              | Render logs as text, strip or safely convert ANSI, cap log size, authenticate SSE streams                                                                                                                                                                                                                        | 3     |
| T7  | Caddy → apps     | User apps read dashboard cookies or share its origin                                 | Dashboard on its own domain, separate from app domains (or a public-suffix domain for apps); cookies never scoped to the shared parent domain                                                                                                                                                                    | 2     |
| T8  | Caddy            | Custom domain takeover, Host header abuse, ACME abuse                                | Prove domain ownership (TXT record) before routing, explicit host matchers only, no catch-all to the dashboard, on-demand TLS gated by an `ask` endpoint                                                                                                                                                         | 2     |
| T9  | API → Docker     | Worker or API compromise becomes host root                                           | Worker is the only component with Docker access, through a socket proxy that allows only required endpoints, or rootless Docker; the API never mounts the socket                                                                                                                                                 | 2     |
| T10 | Build sandbox    | Build escapes to the host or steals platform secrets                                 | Rootless BuildKit, no `docker.sock`, no privileged mode, no platform credentials in the build environment, CPU, memory, disk and time limits                                                                                                                                                                     | 2     |
| T11 | Build / services | Access to internal network, Postgres, Docker API or cloud metadata (169.254.169.254) | Egress deny to RFC 1918, link-local and the host by default; per-project networks; Postgres and worker not reachable from user networks                                                                                                                                                                          | 2     |
| T12 | Services → host  | Container escape, lateral movement                                                   | Non-root user, `cap-drop ALL`, `no-new-privileges`, default seccomp and AppArmor, read-only root filesystem where possible, per-project networks, quotas                                                                                                                                                         | 2     |
| T13 | Secrets          | Secrets leak at rest, in logs, in the UI or in image layers                          | Envelope encryption with the key outside the database, masked in the UI, redacted in logs (`tracing` field filters), injected at runtime only, never as build args                                                                                                                                               | 2–3   |
| T14 | Outbound         | SSRF via webhooks, health checks, Git URLs or image registries                       | Allowlist schemes (`https`, `ssh` for Git), resolve DNS then block private and link-local IPs (rebinding-safe), no redirects to internal addresses, timeouts                                                                                                                                                     | 2     |
| T15 | Git webhooks     | Forged or replayed webhooks trigger deploys                                          | HMAC-SHA256 verified in constant time, delivery ID idempotency, timestamp window                                                                                                                                                                                                                                 | 3     |
| T16 | Git credentials  | Over-scoped or leaked Git tokens                                                     | Prefer a GitHub App with per-repo, read-only permissions; encrypt tokens like secrets; never log clone URLs that carry credentials                                                                                                                                                                               | 2     |
| T17 | Resources        | Crypto mining, fork bombs, disk or inode exhaustion                                  | cgroup limits (CPU, memory, pids), disk quotas, build timeouts, metrics and alerts                                                                                                                                                                                                                               | 2     |
| T18 | Installer        | Default credentials, unsigned installer or updates                                   | First admin created at install time with a generated secret, no default password, signed releases and checksums, no unauthenticated update channel                                                                                                                                                               | 4     |
| T19 | Audit            | Admin actions without trace                                                          | Append-only audit log for auth, secret access, deploys and settings changes                                                                                                                                                                                                                                      | 3     |
| T20 | Backups          | Backups readable or tampered with                                                    | Encrypted backups, separate credentials, automated restore tests                                                                                                                                                                                                                                                 | 3     |
| T21 | Supply chain     | Malicious dependency, compromised Action or base image, tampered release             | See [Supply chain](#supply-chain)                                                                                                                                                                                                                                                                                | 0     |

## Risks accepted by the single-tenant model

These are accepted while Penelope is single-tenant and documented in `SECURITY.md`:

- **No isolation between projects or users.** A deployed app may read other projects' traffic on
  shared networks, or affect them through shared resources. Per-project networks and quotas exist
  for reliability and defense in depth, not as a security promise.
- **Deployed code is trusted.** A malicious repository the operator chooses to deploy is out of
  scope. Build hardening (T10) reduces the blast radius but is not a guarantee.
- **Every operator sees every secret.** No per-project secret ACLs yet; every authenticated operator
  is effectively an admin of the installation.
- **Noisy neighbours.** Quotas are best effort. Resource exhaustion by a deployed app is an
  availability problem, not a vulnerability.

What is **not** accepted, even in single-tenant mode: access to the control plane from the internet
without auth (T1–T5), the Docker API exposed to builds or apps (T9–T10), secrets in logs or image
layers (T13), and SSRF from Penelope's own outbound requests (T14).

### Other accepted risks

- **`style-src 'unsafe-inline'` on the dashboard CSP.** Radix UI (through `react-remove-scroll-bar`) and Sonner inject `<style>` elements at runtime. The Radix style embeds the measured scrollbar gap, so its content varies by browser and OS and cannot be pinned with a hash; nonces would need per-request HTML rendering, which the static Caddy deployment does not do. Impact is limited: `script-src 'self'` has no `unsafe-*` keywords, and `img-src`, `font-src` and `connect-src` are `'self'`, which blocks the usual CSS-injection exfiltration channels to third-party origins. React escapes rendered text and the dashboard does not use `dangerouslySetInnerHTML`. Revisit when Radix and Sonner support nonces or constructable stylesheets, or if the dashboard moves to server-rendered HTML with per-request nonces. Owner: Kai. Review by: 2027-05-21.

Any `trustedTypes.createPolicy` requires a named policy explicitly listed in `trusted-types` and
AppSec (Kai) review; the default stays `'none'`.

## Items that reopen if Penelope goes multi-tenant

Moving to multi-tenant requires a new version of this document and a dedicated review before any
release. At least:

1. **Strong runtime isolation**: gVisor, Kata or Firecracker microVMs for builds and services, not
   only namespaces and cgroups on a shared kernel.
2. **Network isolation as a security boundary**: per-tenant networks with enforced egress policy,
   no shared bridges, tested escape and lateral movement suites.
3. **Tenant-scoped authorization**: teams, roles, per-project secret ACLs, and authorization tests
   across tenants for every endpoint.
4. **Secrets per tenant**: separate encryption keys per tenant, rotation, and audited access.
5. **Abuse handling**: signup controls, mining detection, hard quotas and billing limits.
6. **Domains**: app domains on a public-suffix domain, stricter custom domain verification.
7. **Shared build cache**: per-tenant cache, or no cache sharing, to prevent cache poisoning.
8. **Logs and metrics**: per-tenant scoping of SSE streams, logs and metrics endpoints.

## Supply chain

### Phase 0 controls

- **Lockfiles frozen**: `pnpm install --frozen-lockfile` and `cargo ... --locked` in CI.
- **Install scripts**: keep pnpm's dependency build scripts blocked except the `allowBuilds`
  allowlist; remove the explicit `ignore-scripts=false`; changes to `.npmrc`, `pnpm-workspace.yaml`,
  `Cargo.toml` and `deny.toml` need CODEOWNERS review.
- **GitHub Actions**: every third-party action pinned to a full commit SHA with a version comment
  (`uses: owner/action@<40-char-sha> # vX.Y.Z`); top-level `permissions: contents: read`, raised
  per job only when needed; `actions/checkout` with `persist-credentials: false`; no
  `pull_request_target` that checks out PR code; no secrets printed in logs; caches keyed on
  lockfile hashes and never shared with untrusted PR runs that write to them.
- **Dependabot** for npm, Cargo, GitHub Actions and Docker; **CodeQL** for JavaScript/TypeScript
  (and Rust once supported in the repo setup); **secret scanning** with push protection.
- **Images**: base images pinned by digest; SBOM attached to releases once releases exist.
- **New dependencies**: reviewed in the PR (maintenance, popularity, license, install scripts).

### Proposal: `cargo audit` and `cargo deny` (when the Rust skeleton lands)

Not implemented yet. This lands together with the Rust skeleton in `apps/api` (Theo, Phase 0).

**CI job** (sketch; pin every action to a full SHA with a version comment before merging):

```yaml
rust-supply-chain:
  runs-on: ubuntu-latest
  permissions:
    contents: read
  steps:
    - uses: actions/checkout@<full-sha> # vX.Y.Z
      with:
        persist-credentials: false
    - uses: dtolnay/rust-toolchain@<full-sha> # stable
    - name: Install cargo-audit and cargo-deny
      run: cargo install --locked cargo-audit cargo-deny
    - name: cargo audit (RustSec advisories)
      run: cargo audit --deny warnings
    - name: cargo deny (advisories, licenses, bans, sources)
      run: cargo deny --locked check advisories licenses bans sources
```

Run it on every PR that touches `Cargo.toml`, `Cargo.lock` or `deny.toml`, and on a daily schedule
so new advisories show up without a code change. Installing the binaries from crates.io with
`--locked` avoids yet another third-party action. A pinned `EmbarkStudios/cargo-deny-action` is an
acceptable alternative.

**Initial `deny.toml`** (suggested starting point, at the workspace root):

```toml
[graph]
all-features = true

[advisories]
version = 2
db-path = "~/.cargo/advisory-db"
db-urls = ["https://github.com/rustsec/advisory-db"]
yanked = "deny"
# Every ignore needs an advisory ID, a reason and an expiry date in a comment.
ignore = []

[licenses]
version = 2
confidence-threshold = 0.93
# Compatible with Penelope's Apache-2.0 license. Add new licenses through review only.
allow = [
  "Apache-2.0",
  "Apache-2.0 WITH LLVM-exception",
  "MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Zlib",
  "Unicode-3.0",
]
exceptions = []

[bans]
multiple-versions = "warn"
wildcards = "deny"
highlight = "all"
# Prefer rustls over OpenSSL to keep the build self-contained.
deny = [
  { crate = "openssl", reason = "use rustls" },
  { crate = "openssl-sys", reason = "use rustls" },
]
skip = []
skip-tree = []

[sources]
unknown-registry = "deny"
unknown-git = "deny"
allow-registry = ["https://github.com/rust-lang/crates.io-index"]
allow-git = []
```

Notes:

- `ignore`, `exceptions`, `skip` and `allow-git` start empty. Every entry needs a reason in the PR.
- `multiple-versions` starts as `warn` because the Axum/Tokio tree commonly pulls duplicate
  versions; move to `deny` once the tree is clean.
- Revisit the license list if a needed crate uses `MPL-2.0` (weak copyleft, usually acceptable for
  dependencies) or anything copyleft.

## Controls by phase

| Phase | Security controls                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | `SECURITY.md` and this document; hardened CI (pinned actions, minimal permissions, frozen lockfiles); protected `main` with review; Dependabot, CodeQL, secret scanning; `cargo audit` / `cargo deny` with the Rust skeleton; deny-by-default authorization middleware in the Axum skeleton; security headers for the dashboard served by Caddy; self-hosted fonts to allow a strict CSP                                                        |
| 1     | Session auth (T1, T2), CSRF, login rate limit, per-endpoint authorization with negative tests (T3), validated typed inputs (T4), JSON logs with request ID and secret redaction                                                                                                                                                                                                                                                                 |
| 2     | Update this model before code; socket proxy or rootless Docker (T9); rootless build sandbox without platform secrets (T10); egress limits to internal networks and metadata (T11); container hardening and quotas (T12, T17); encrypted env vars from the first deploy (T13); SSRF-safe outbound client (T14); scoped Git credentials (T16); dashboard on a separate domain and verified custom domains (T7, T8); container escape tests in E2E |
| 3     | Log rendering and authenticated SSE (T6); signed, idempotent webhooks (T15); secret rotation and audit (T13, T19); encrypted backups with restore tests (T20)                                                                                                                                                                                                                                                                                   |
| 4     | Scoped, revocable API tokens for the public API and CLI; installer without default credentials and signed releases (T18); dedicated security review and internal pentest before 1.0                                                                                                                                                                                                                                                             |
