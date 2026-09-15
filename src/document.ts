import type { Diagnostic } from "@stemsketch/schema";
import { diagnostic } from "@stemsketch/schema";

export const StudioCodes = {
  STUDIO_INVALID_JSON: "STUDIO_INVALID_JSON",
  STUDIO_UNSUPPORTED_KIND: "STUDIO_UNSUPPORTED_KIND",
  STUDIO_NODE_NOT_FOUND: "STUDIO_NODE_NOT_FOUND",
  STUDIO_COMPILE_REQUIRED: "STUDIO_COMPILE_REQUIRED",
} as const;

export function parseJsonDocument(
  text: string,
): { ok: true; value: unknown } | { ok: false; diagnostics: Diagnostic[] } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        diagnostic({
          code: StudioCodes.STUDIO_INVALID_JSON,
          severity: "error",
          message: error instanceof Error ? error.message : "invalid JSON",
          path: "/",
        }),
      ],
    };
  }
}

export function findNodeIndex(
  value: unknown,
  nodeId: string,
): { index: number; path: string } | undefined {
  if (typeof value !== "object" || value === null || !("nodes" in value)) {
    return undefined;
  }
  const nodes = (value as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return undefined;
  }
  const index = nodes.findIndex(
    (node) => typeof node === "object" && node !== null && (node as { id?: unknown }).id === nodeId,
  );
  if (index < 0) {
    return undefined;
  }
  return { index, path: `/nodes/${index}` };
}
