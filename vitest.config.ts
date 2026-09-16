import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

function ir(name: string): string {
  return fileURLToPath(new URL(`../stemsketch-ir/packages/${name}/src/index.ts`, import.meta.url));
}

function compiler(name: string): string {
  return fileURLToPath(
    new URL(`../stemsketch-compiler/packages/${name}/src/index.ts`, import.meta.url),
  );
}

export default defineConfig({
  resolve: {
    alias: {
      "@stemsketch/graph": ir("graph"),
      "@stemsketch/schema": ir("schema"),
      "@stemsketch/semantic-identity": ir("semantic-identity"),
      "@stemsketch/expression-ir": ir("expression-ir"),
      "@stemsketch/simulation-ir": ir("simulation-ir"),
      "@stemsketch/physics-ir": ir("physics-ir"),
      "@stemsketch/knowledge-ir": ir("knowledge-ir"),
      "@stemsketch/artifact-ir": ir("artifact-ir"),
      "@stemsketch/layout-ir": ir("layout-ir"),
      "@stemsketch/scene-ir": ir("scene-ir"),
      "@stemsketch/view-ir": ir("view-ir"),
      "@stemsketch/viewdeck-ir": ir("viewdeck-ir"),
      "@stemsketch/transition-ir": ir("transition-ir"),
      "@stemsketch/svg-ir": ir("svg-ir"),
      "@stemsketch/diagnostics": compiler("diagnostics"),
      "@stemsketch/compiler-core": compiler("compiler-core"),
      "@stemsketch/dsl-core": compiler("dsl-core"),
      "@stemsketch/validator": compiler("validator"),
      "@stemsketch/normalizer": compiler("normalizer"),
      "@stemsketch/layout": compiler("layout"),
      "@stemsketch/transition": compiler("transition"),
      "@stemsketch/compiler-viewdeck": compiler("compiler-viewdeck"),
      "@stemsketch/compiler-svg": compiler("compiler-svg"),
      "@stemsketch/compiler-physics": compiler("compiler-physics"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
