# Helene

Reusable UI component library for Abyssus products, published in this monorepo as `@helene/ui`.

Helene is a standalone package. It must not depend on Penelope, `@penelope/*`, or anything under `apps/web`. The name is independent of Penelope so the library can be shared without implying a product-specific API.

This pull request only adds the package skeleton (`package.json`, `tsconfig.json`, `src/index.ts`, and this README). The Radix-based primitives in `apps/web/src/components/ui` will move here in a follow-up.
