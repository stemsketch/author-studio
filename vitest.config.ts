import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Resolve every `@stemsketch/*` workspace package from the sibling checkouts' sources, so tests run against current
 * IR and compiler code without a prior build and without a hand-kept alias list that goes stale when a package is added.
 */
function workspaceAliases(...roots: string[]): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const root of roots) {
    const base = fileURLToPath(new URL(`../${root}/packages/`, import.meta.url));
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const manifest = `${base}${entry.name}/package.json`;
      const source = `${base}${entry.name}/src/index.ts`;
      if (!entry.isDirectory() || !existsSync(manifest) || !existsSync(source)) continue;
      const name = (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name;
      if (name) aliases[name] = source;
    }
  }
  return aliases;
}

export default defineConfig({
  resolve: { alias: workspaceAliases("stemsketch-ir", "stemsketch-compiler") },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
