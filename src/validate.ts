import { validateArtifactDocument } from "@stemsketch/artifact-ir";
import { validateDataDocument } from "@stemsketch/data-ir";
import { validateGraph } from "@stemsketch/graph";
import type { IRGraphDocument } from "@stemsketch/graph";
import { validateKnowledgeDocument } from "@stemsketch/knowledge-ir";
import { validateLayoutDocument } from "@stemsketch/layout-ir";
import { validatePhysicsDocument } from "@stemsketch/physics-ir";
import { validateTimelineDocument } from "@stemsketch/presentation-timeline-ir";
import { validateSceneDocument } from "@stemsketch/scene-ir";
import { diagnostic } from "@stemsketch/schema";
import type { Diagnostic } from "@stemsketch/schema";
import { validateSimulationRequest, validateSimulationResult } from "@stemsketch/simulation-ir";
import { validateTransitionDocument } from "@stemsketch/transition-ir";
import { validateCompilationUnit } from "@stemsketch/validator";
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

/**
 * Every canonical document kind the studio can check on its own, with the IR validator for it. The studio holds no
 * validation rules of its own: it routes a document to the package that owns its kind.
 */
const VALIDATORS: Readonly<Record<string, (value: unknown) => { diagnostics: Diagnostic[] }>> = {
  "stemsketch.knowledge": (value) => validateKnowledgeDocument(value),
  "stemsketch.artifact": (value) => validateArtifactDocument(value),
  "stemsketch.layout": (value) => validateLayoutDocument(value),
  "stemsketch.scene": (value) => validateSceneDocument(value),
  "stemsketch.view": (value) => validateViewDocument(value),
  "stemsketch.viewdeck": (value) => validateViewDeckDocument(value),
  "stemsketch.transition": (value) => validateTransitionDocument(value),
  "stemsketch.presentation-timeline": (value) => validateTimelineDocument(value),
  "stemsketch.physics": (value) => validatePhysicsDocument(value),
  "stemsketch.data": (value) => validateDataDocument(value),
  "stemsketch.simulation-request": (value) => validateSimulationRequest(value),
  "stemsketch.simulation-result": (value) => validateSimulationResult(value),
};

/** Where a lone document sits in a compilation unit. */
const UNIT_KEYS: Readonly<Record<string, string>> = {
  "stemsketch.knowledge": "knowledge",
  "stemsketch.artifact": "artifacts",
  "stemsketch.layout": "layout",
  "stemsketch.scene": "scene",
  "stemsketch.view": "view",
  "stemsketch.viewdeck": "viewdeck",
  "stemsketch.transition": "transitions",
};

const UNIT_FIELDS = [
  "knowledge",
  "artifacts",
  "layout",
  "scene",
  "view",
  "viewdeck",
  "transitions",
  "timelines",
];

function isUnit(value: Record<string, unknown>): boolean {
  return value.kind === undefined && UNIT_FIELDS.some((field) => value[field] !== undefined);
}

export function toCompilationUnit(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  if (isUnit(value)) {
    return value;
  }
  const kind = documentKind(value);
  if (kind === "stemsketch.presentation-timeline") {
    return { timelines: [value] };
  }
  const key = kind === undefined ? undefined : UNIT_KEYS[kind];
  return key === undefined ? value : { [key]: value };
}

function failure(
  code: string,
  message: string,
  path: string,
): { ok: false; diagnostics: Diagnostic[] } {
  return { ok: false, diagnostics: [diagnostic({ code, severity: "error", message, path })] };
}

const noErrors = (diagnostics: readonly Diagnostic[]): boolean =>
  !diagnostics.some((issue) => issue.severity === "error");

export function validateStemsketchValue(value: unknown): {
  ok: boolean;
  diagnostics: Diagnostic[];
} {
  if (!isRecord(value)) {
    return failure(
      StudioCodes.STUDIO_UNSUPPORTED_KIND,
      "STEMSketch document must be an object",
      "/",
    );
  }

  if (isUnit(value)) {
    const result = validateCompilationUnit(value as Parameters<typeof validateCompilationUnit>[0]);
    return { ok: result.ok, diagnostics: result.diagnostics };
  }

  const kind = documentKind(value);
  const validator = kind === undefined ? undefined : VALIDATORS[kind];
  if (validator) {
    const { diagnostics } = validator(value);
    return { ok: noErrors(diagnostics), diagnostics };
  }
  if (kind === "stemsketch.graph") {
    const graph = value as unknown as IRGraphDocument;
    const result = validateGraph(graph);
    return { ok: result.ok, diagnostics: graphDiagnostics(graph) };
  }
  return failure(
    StudioCodes.STUDIO_UNSUPPORTED_KIND,
    `unsupported STEMSketch kind ${JSON.stringify(kind)}`,
    "/kind",
  );
}

export function validateStemsketchText(text: string): { ok: boolean; diagnostics: Diagnostic[] } {
  const parsed = parseJsonDocument(text);
  if (!parsed.ok) {
    return parsed;
  }
  return validateStemsketchValue(parsed.value);
}
