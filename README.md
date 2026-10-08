# author-studio

VS Code extension and author-facing IDE integration for STEMSketch.

This client uses local IR validators and Physics DSL language tooling (not VS Code-specific) for fast deterministic diagnostics, and talks to `author-services` for compile jobs. `.physics` files are first-class. Preview shows the last compile result. Connection status is a status bar item. Author Services URL is configuration; session tokens use VS Code secret storage. Provider secrets are never shipped in the extension.

It must not become a second compiler, embed backend secrets, or define canonical IR types. See [ADR-0001](https://github.com/stemsketch/stemsketch/blob/main/docs/adr/0001-stemsketch-greenfield-architecture.md) and [ADR-0002](https://github.com/stemsketch/stemsketch/blob/main/docs/adr/0002-canonical-semantic-identity-and-domain-dsls.md).

## Status

Phase 17 AI authoring commands generate, repair, and explain IR through Author Services. All AI documents are validated before compile/preview. Linked packages expect sibling `stemsketch-ir` and `stemsketch-compiler` checkouts. The studio checks documents with the IR package that owns each kind and with the compiler repository's `validator` for whole compilation units; it contains no validation rules of its own.

## Local development

Requires Node.js 24.21+, [pnpm](https://pnpm.io/) 11, and sibling `stemsketch-ir` and `stemsketch-compiler` checkouts.

```bash
pnpm install
pnpm format-check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
