import { validateArtifactDocument } from "@stemsketch/artifact-ir";
import { validateGraph } from "@stemsketch/graph";
import type { IRGraphDocument } from "@stemsketch/graph";
import { validateKnowledgeDocument } from "@stemsketch/knowledge-ir";
import { validateLayoutDocument } from "@stemsketch/layout-ir";
import { diagnostic } from "@stemsketch/schema";
import type { Diagnostic } from "@stemsketch/schema";
import { validateSceneDocument } from "@stemsketch/scene-ir";
import { validateViewDocument } from "@stemsketch/view-ir";
import { validateViewDeckDocument } from "@stemsketch/viewdeck-ir";

import { StudioCodes, parseJsonDocument } from "./document.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function graphDiagnostics(document: IRGraphDocument): Diagnostic[] {
  return validateGraph(document).issues.map((issue) =>
    diagnostic({
      code: issue.code,
      severity: "error",
      message: issue.message,
      path: issue.path,
      ...(issue.nodeId !== undefined ? { nodeId: issue.nodeId } : {}),
    }),
  );
}

export function documentKind(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return undefined;
  }
  return value.kind;
}

export function toCompilationUnit(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  if (value.knowledge !== undefined || value.artifacts !== undefined) {
    return value;
  }
  const kind = documentKind(value);
  if (kind === "stemsketch.knowledge") {
    return { knowledge: value };
  }
  if (kind === "stemsketch.artifact") {
    return { artifacts: value };
  }
  if (kind === "stemsketch.layout") {
    return { layout: value };
  }
  if (kind === "stemsketch.scene") {
    return { scene: value };
  }
  if (kind === "stemsketch.view") {
    return { view: value };
  }
  if (kind === "stemsketch.viewdeck") {
    return { viewdeck: value };
  }
  return value;
}

export function validateStemsketchValue(value: unknown): {
  ok: boolean;
  diagnostics: Diagnostic[];
} {
  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostics: [
        diagnostic({
          code: StudioCodes.STUDIO_UNSUPPORTED_KIND,
          severity: "error",
          message: "STEMSketch document must be an object",
          path: "/",
        }),
      ],
    };
  }

  if (value.knowledge !== undefined || value.artifacts !== undefined) {
    const diagnostics: Diagnostic[] = [];
    if (value.knowledge !== undefined) {
      diagnostics.push(...validateKnowledgeDocument(value.knowledge).diagnostics);
    }
    if (value.artifacts !== undefined) {
      diagnostics.push(
        ...validateArtifactDocument(value.artifacts, value.knowledge as never).diagnostics,
      );
    }
    if (value.layout !== undefined) {
      diagnostics.push(...validateLayoutDocument(value.layout).diagnostics);
    }
    if (value.scene !== undefined) {
      diagnostics.push(
        ...validateSceneDocument(value.scene, {
          ...(value.layout !== undefined ? { layout: value.layout as never } : {}),
          ...(value.artifacts !== undefined ? { artifacts: value.artifacts as never } : {}),
        }).diagnostics,
      );
    }
    if (value.view !== undefined) {
      diagnostics.push(...validateViewDocument(value.view, value.artifacts as never).diagnostics);
    }
    if (value.viewdeck !== undefined) {
      diagnostics.push(
        ...validateViewDeckDocument(value.viewdeck, value.artifacts as never).diagnostics,
      );
    }
    return { ok: diagnostics.length === 0, diagnostics };
  }

  const kind = documentKind(value);
  if (kind === "stemsketch.knowledge") {
    return validateKnowledgeDocument(value);
  }
  if (kind === "stemsketch.artifact") {
    return validateArtifactDocument(value);
  }
  if (kind === "stemsketch.layout") {
    return validateLayoutDocument(value);
  }
  if (kind === "stemsketch.scene") {
    return validateSceneDocument(value);
  }
  if (kind === "stemsketch.view") {
    return validateViewDocument(value);
  }
  if (kind === "stemsketch.viewdeck") {
    return validateViewDeckDocument(value);
  }
  if (kind === "stemsketch.graph") {
    const graph = value as unknown as IRGraphDocument;
    const result = validateGraph(graph);
    return { ok: result.ok, diagnostics: graphDiagnostics(graph) };
  }
  return {
    ok: false,
    diagnostics: [
      diagnostic({
        code: StudioCodes.STUDIO_UNSUPPORTED_KIND,
        severity: "error",
        message: `unsupported STEMSketch kind ${JSON.stringify(kind)}`,
        path: "/kind",
      }),
    ],
  };
}

export function validateStemsketchText(text: string): { ok: boolean; diagnostics: Diagnostic[] } {
  const parsed = parseJsonDocument(text);
  if (!parsed.ok) {
    return parsed;
  }
  return validateStemsketchValue(parsed.value);
}
