# author-studio

VS Code extension and author-facing IDE integration for STEMSketch.

This client uses local IR validators for fast deterministic diagnostics and talks to `author-services` for compile jobs. Preview shows the last compile result. Connection status is a status bar item. Author Services URL is configuration; session tokens use VS Code secret storage. Provider secrets are never shipped in the extension.

It must not become a second compiler, embed backend secrets, or define canonical IR types. See [ADR-0001](https://github.com/stemsketch/stemsketch/blob/main/docs/adr/0001-stemsketch-greenfield-architecture.md).

## Status

Phase 17 AI authoring commands generate, repair, and explain IR through Author Services. All AI documents are validated before compile/preview. Linked IR packages expect a sibling `stemsketch-ir` checkout.

## Local development

Requires Node.js 24.21+, [pnpm](https://pnpm.io/) 11, and a sibling `stemsketch-ir` checkout.

```bash
pnpm install
pnpm format-check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
