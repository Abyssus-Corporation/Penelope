<div align="center">

# 🤝 Contributing to Penelope

> Thanks for your interest in contributing. Before you start, please open a GitHub issue to discuss the feature or bug with the team — this keeps effort aligned and avoids duplicate work.

</div>

---

- [Commit Convention](#commit-convention)
- [Setup](#setup)
- [Development](#development)
- [Pull Request](#pull-request)

---

## 📐 Commit Convention

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                                             |
| ---------- | ----------------------------------------------------------------------- |
| `feat`     | A new feature                                                           |
| `fix`      | A bug fix                                                               |
| `docs`     | Documentation only                                                      |
| `style`    | Formatting, whitespace — no logic change                                |
| `refactor` | Code change that is neither a fix nor a feature                         |
| `perf`     | Performance improvement                                                 |
| `test`     | Adding or correcting tests                                              |
| `build`    | Build system or dependency changes                                      |
| `ci`       | CI configuration                                                        |
| `chore`    | Everything else that doesn't touch `src` or `test`                      |
| `revert`   | Reverts a previous commit                                               |

**Example:**

```
feat(dashboard): add project search filtering
```

---

## ⚙️ Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/Abyssus-Corporation/Penelope.git
cd Penelope
pnpm install
```

> Requires **Node.js ≥ 20** and **pnpm ≥ 9**.

---

## 🧪 Development

Start the web app dev server:

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

Additional commands:

```bash
pnpm typecheck   # TypeScript type-check across all packages
pnpm lint        # ESLint across all packages
pnpm format      # Prettier across apps/**
pnpm build       # Production build
```

---

## 🔀 Pull Request

- **Open an issue first** for any significant change — features, refactors, or anything that touches multiple files. PRs without a linked issue may be closed.
- **One thing per PR.** Each pull request should address a single, well-defined problem or add one feature. Scattered or unfocused diffs are hard to review and easy to revert.
- **Test your changes.** Verify that your changes work locally before submitting. PRs that clearly haven't been run will be rejected.
- **Keep scope tight.** Avoid padding PRs with unrelated whitespace fixes, IDE-generated formatting changes, or variable cleanups unless that's the explicit goal.
- **Describe what changed and why.** A clear description + screenshot or screen recording goes a long way.
- **Reference open issues.** If your PR resolves an existing issue, link it in the description (`Fixes #123`, `Closes #456`).
- **Large features need prior alignment.** PRs that introduce broad new functionality without an open issue discussing the design will not be accepted.

Once your PR is merged, you'll be automatically added as a contributor. Thank you for helping build Penelope.
