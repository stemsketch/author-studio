# STEMSketch Author Studio

Single workspace for knowledge pack authoring. Open this folder in Cursor/VS Code — settings are preconfigured.

## Quick start

1. **Start Author Services** (trusted local offline):

   ```powershell
   cd ..\author-services
   copy .env.example .env
   pnpm install
   pnpm build
   pnpm dev
   ```

   Service runs at `http://127.0.0.1:4010` with dev key `dev-author-local`.

2. **Open this repo** in Cursor/VS Code.

3. Install recommended extension (**StemSketch Knowledge** enterprise VSIX from platform build).

4. Run **StemSketch: Configure Author API Key** → enter `dev-author-local`.

5. Run **StemSketch: Author Checklist** on `packs/starter/`.

## Layout

| Path | Purpose |
|------|---------|
| `packs/starter/` | Sample platform knowledge pack |
| `contributions/` | Signed contribution bundles |
| `.stemsketch/cache/` | Kit cache (trust, taxonomy) from Author Services |
| `.vscode/settings.json` | Enterprise edition + API base URL |

## Offline authoring

Trusted authors run `author-services` locally. The extension uses `stemsketch.authorApiBase` (`http://127.0.0.1:4010`) — no platform monorepo required.

Production: point `stemsketch.authorApiBase` at your hosted Author Services URL and use an org API key with `author` scope.

## Scripts

```powershell
.\scripts\doctor.ps1   # ping Author Services health + kit
```
