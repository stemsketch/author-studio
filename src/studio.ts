import type { Diagnostic } from "@stemsketch/schema";
import { diagnostic } from "@stemsketch/schema";

import type { AuthorServicesClient, CompileJob } from "./client.js";
import { StudioCodes, findNodeIndex, parseJsonDocument } from "./document.js";
import { toCompilationUnit, validateStemsketchText } from "./validate.js";
import { isStemsketchWorkspace } from "./workspace.js";

export type ConnectionStatus = "disconnected" | "connected" | "unauthorized" | "error";

export class AuthorStudio {
  connection: ConnectionStatus = "disconnected";
  lastJob: CompileJob | undefined;
  lastDiagnostics: Diagnostic[] = [];

  constructor(private readonly client: AuthorServicesClient) {}

  recognize(entryNames: readonly string[]): boolean {
    return isStemsketchWorkspace(entryNames);
  }

  validate(text: string): { ok: boolean; diagnostics: Diagnostic[] } {
    const result = validateStemsketchText(text);
    this.lastDiagnostics = result.diagnostics;
    return result;
  }

  async connect(): Promise<ConnectionStatus> {
    try {
      const health = await this.client.health();
      this.connection = health.status === "ok" ? "connected" : "error";
    } catch {
      this.connection = "error";
    }
    return this.connection;
  }

  async compile(text: string): Promise<CompileJob> {
    const parsed = parseJsonDocument(text);
    if (!parsed.ok) {
      this.lastDiagnostics = parsed.diagnostics;
      const failed: CompileJob = {
        id: "job_invalid_json",
        status: "failed",
        compiled: false,
        validated: false,
        diagnostics: parsed.diagnostics,
      };
      this.lastJob = failed;
      return failed;
    }
    const local = this.validate(text);
    if (!local.ok) {
      const failed: CompileJob = {
        id: "job_invalid_ir",
        status: "failed",
        compiled: false,
        validated: true,
        diagnostics: local.diagnostics,
      };
      this.lastJob = failed;
      return failed;
    }
    const { jobId } = await this.client.compile(toCompilationUnit(parsed.value));
    const job = await this.client.job(jobId);
    this.lastJob = job;
    this.lastDiagnostics = (job.diagnostics as Diagnostic[]) ?? [];
    return job;
  }

  preview(): { ok: boolean; body: string; diagnostics: Diagnostic[] } {
    if (this.lastJob?.result === undefined) {
      const diagnostics = [
        diagnostic({
          code: StudioCodes.STUDIO_COMPILE_REQUIRED,
          severity: "warning",
          message: "compile a STEMSketch document before preview",
          path: "/",
        }),
      ];
      return { ok: false, body: "", diagnostics };
    }
    return { ok: true, body: JSON.stringify(this.lastJob.result, null, 2), diagnostics: [] };
  }

  gotoNode(
    text: string,
    nodeId: string,
  ): { ok: boolean; path?: string; diagnostics: Diagnostic[] } {
    const parsed = parseJsonDocument(text);
    if (!parsed.ok) {
      return parsed;
    }
    const found = findNodeIndex(parsed.value, nodeId);
    if (!found) {
      return {
        ok: false,
        diagnostics: [
          diagnostic({
            code: StudioCodes.STUDIO_NODE_NOT_FOUND,
            severity: "error",
            message: `no graph node ${nodeId}`,
            path: "/nodes",
            nodeId,
          }),
        ],
      };
    }
    return { ok: true, path: found.path, diagnostics: [] };
  }
}

export function connectionLabel(status: ConnectionStatus): string {
  if (status === "connected") {
    return "STEMSketch: connected";
  }
  if (status === "unauthorized") {
    return "STEMSketch: unauthorized";
  }
  if (status === "error") {
    return "STEMSketch: error";
  }
  return "STEMSketch: disconnected";
}
