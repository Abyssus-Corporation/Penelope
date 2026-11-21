# Security Policy

## Reporting a vulnerability

**Please do not open public issues, pull requests or discussions for security problems.**

Report vulnerabilities privately through GitHub:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** (GitHub private vulnerability reporting).
3. Describe the issue, the affected commit or component, steps to reproduce, and the impact you expect.

Reports go to the maintainers as a draft
[security advisory](https://github.com/Abyssus-Corporation/Penelope/security/advisories), where we
can discuss, fix and credit the finding privately.

Please include, when possible:

- The commit SHA you tested.
- A minimal proof of concept. Test only against your own installation; never against systems you do
  not own.
- Whether the issue is already public or known to third parties.

## Response targets

These are targets for a small team on a pre-release project, not contractual SLAs.

| Step                                         | Target                         |
| -------------------------------------------- | ------------------------------ |
| Acknowledge the report                       | 3 business days                |
| Initial assessment and severity              | 7 business days                |
| Fix or mitigation for Critical / High issues | 30 days                        |
| Fix or mitigation for Medium / Low issues    | 90 days, or next planned phase |
| Public advisory after a fix is available     | Coordinated with the reporter  |

We will keep you updated in the advisory thread and credit you unless you prefer otherwise.

## Supported versions

Penelope is **pre-release**. There are no tagged releases yet.

| Version          | Supported |
| ---------------- | --------- |
| `main` (latest)  | Yes       |
| Any other branch | No        |

Fixes land on `main` only. Once versioned releases exist, this table will list which ones receive
security fixes.

## Trust model: single-tenant

Penelope is designed as a **single-tenant**, self-hosted platform. Read this before deploying it.

- **All deployed code is trusted.** Penelope assumes that every repository, Dockerfile, image and
  service it builds or runs belongs to the operator of the installation, or to people the operator
  fully trusts.
- **No isolation between tenants.** Penelope does not provide security isolation between
  users, teams or projects on the same installation. Anyone who can deploy code should be treated as
  having access to the whole installation, including other projects' variables and secrets.
- **Do not run third-party or untrusted code.** Do not let untrusted users sign up and deploy, and do
  not build or run repositories you have not reviewed.
- **Multi-tenant use is out of scope** until Penelope ships and documents isolation for builds,
  containers, networks and secrets. Until then, reports that depend only on "a deployed app can affect
  another app on the same installation" are treated as expected behavior, not vulnerabilities.

Build and service hardening (rootless builds, no Docker socket in builds, network egress limits) is
still on the roadmap as defense in depth. It does not change the trust model above.

## Scope

In scope:

- Code in this repository: the web dashboard (`apps/web`), the API and workers (as they are added),
  shared packages, and the build, deploy and proxy configuration Penelope generates (including Caddy
  configuration).
- Authentication, session and authorization flaws in the dashboard and API.
- Leaks of secrets or environment variables through logs, the UI, the API or built images.
- Paths from the public internet, or from a deployed app, to the Penelope control plane or the host.
- The CI/CD pipeline and supply chain of this repository (workflows, dependencies, release
  artifacts).

Out of scope:

- Isolation between projects or users on the same installation (see the trust model).
- Vulnerabilities in applications that operators deploy with Penelope.
- Issues in third-party dependencies with no demonstrated impact on Penelope. Please report those
  upstream.
- Misconfiguration of the operator's own host, cloud account or DNS.
- Denial of service through volumetric traffic, social engineering, and physical attacks.
- Findings from automated scanners without a demonstrated impact.

## Further reading

- [Initial threat model](docs/security/threat-model.md)
