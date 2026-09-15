# author-studio

VS Code extension and author-facing IDE integration for STEMSketch.

This client uses local libraries for fast deterministic operations and talks to `author-services` for networked, privileged, collaborative, AI-backed, catalog, or compute-heavy work.

It must not become a second compiler, embed backend secrets, or define canonical IR types. See [ADR-0001](https://github.com/stemsketch/stemsketch/blob/main/docs/adr/0001-stemsketch-greenfield-architecture.md).

## Status

Phase 0 foundation only. Extension commands and preview land in Phase 16.

## Local development

Requires Node.js 24.21+ and [pnpm](https://pnpm.io/) 11.

```bash
pnpm install
pnpm format-check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
