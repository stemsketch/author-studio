import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { KnowledgeCodes } from "@stemsketch/knowledge-ir";
import type { KnowledgeDocument } from "@stemsketch/knowledge-ir";

import {
  AuthorServicesClient,
  AuthorStudio,
  COMMANDS,
  activateWith,
  isPhysicsSource,
  isStemsketchFileName,
  isStemsketchWorkspace,
  physicsCompletions,
  repositoryId,
} from "../src/index.js";
import type { CompileJob } from "../src/client.js";
import type { ExtensionContextLike, VscodeLike } from "../src/register.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const irRoot = join(root, "../stemsketch-ir/packages");

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(join(irRoot, relative), "utf8")) as T;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

function knowledgeText(): string {
  return JSON.stringify(
    readJson<KnowledgeDocument>("knowledge-ir/examples/projectile-knowledge.json"),
  );
}

function mockClient(
  calls: Array<{ url: string; body?: string; authorization?: string }>,
): AuthorServicesClient {
  const job: CompileJob = {
    id: "job_1",
    status: "succeeded",
    validated: true,
    compiled: true,
    diagnostics: [],
    result: { view: { kind: "stemsketch.view", title: "Forces" } },
  };
  return new AuthorServicesClient({
    baseUrl: "http://author-services.test",
    getToken: () => "user-session",
    fetchImpl: async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        body: typeof init?.body === "string" ? init.body : undefined,
        authorization: headers.get("authorization") ?? undefined,
      });
      if (url.endsWith("/api/v1/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.endsWith("/api/v1/ai/workflows")) {
        const payload =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as { workflow?: string; intent?: string })
            : {};
        if (payload.workflow === "generate" && payload.intent?.includes("corrupt")) {
          return jsonResponse({
            accepted: false,
            diagnostics: [{ code: "SERVICE_AI_REJECTED", message: "invalid IR" }],
          });
        }
        if (payload.workflow === "explain") {
          return jsonResponse({
            accepted: true,
            diagnostics: [],
            text: `diagnostic:${payload.intent}`,
          });
        }
        return jsonResponse({
          accepted: true,
          diagnostics: [],
          document: JSON.parse(knowledgeText()),
          compile: job,
        });
      }
      if (url.endsWith("/api/v1/dsl/compile")) {
        return jsonResponse({
          ok: true,
          diagnostics: [],
          result: { view: { kind: "stemsketch.view", title: "Physics" }, svg: "<svg/>" },
        });
      }
      if (url.endsWith("/api/v1/compile")) {
        return jsonResponse({ jobId: job.id });
      }
      if (url.endsWith(`/api/v1/jobs/${job.id}`)) {
        return jsonResponse(job);
      }
      return jsonResponse({ error: "unexpected" });
    },
  });
}

function fakeVscode(documentText: string): {
  api: VscodeLike;
  messages: string[];
  commands: Map<string, (...args: unknown[]) => unknown>;
} {
  const messages: string[] = [];
  const commands = new Map<string, (...args: unknown[]) => unknown>();
  const api: VscodeLike = {
    StatusBarAlignment: { Left: 1 },
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2 },
    window: {
      activeTextEditor: {
        document: {
          fileName: join(root, "fixtures/projectile.stemsketch.json"),
          getText: () => documentText,
          uri: { fsPath: "projectile.stemsketch.json" },
        },
      },
      createStatusBarItem: () => ({
        text: "",
        show() {},
        dispose() {},
      }),
      showErrorMessage: async (message) => {
        messages.push(message);
        return undefined;
      },
      showInformationMessage: async (message) => {
        messages.push(message);
        return undefined;
      },
      showInputBox: async () => "concept.projectile-motion",
      createWebviewPanel: () => ({ webview: { html: "" } }),
    },
    commands: {
      registerCommand(command, callback) {
        commands.set(command, callback);
        return { dispose() {} };
      },
    },
    languages: {
      createDiagnosticCollection: () => ({
        set() {},
        clear() {},
        dispose() {},
      }),
    },
    workspace: {
      workspaceFolders: [{ name: "lesson", uri: { fsPath: root } }],
      getConfiguration: () => ({
        get: <T>(_key: string, defaultValue: T) => defaultValue,
      }),
    },
    Diagnostic: class {
      constructor(
        public range: unknown,
        public message: string,
        public severity: number,
      ) {}
    },
    Range: class {
      constructor(
        public start: unknown,
        public end: unknown,
      ) {}
    },
    Position: class {
      constructor(
        public line: number,
        public character: number,
      ) {}
    },
    ViewColumn: { Beside: 2 },
  };
  return { api, messages, commands };
}

function fakeContext(): ExtensionContextLike {
  return {
    subscriptions: [],
    secrets: {
      get: async () => undefined,
      store: async () => undefined,
    },
  };
}

describe("author studio foundation", () => {
  it("recognizes a STEMSketch workspace and contributed commands", () => {
    expect(repositoryId).toBe("author-studio");
    expect(isStemsketchWorkspace([".stemsketch", "README.md"])).toBe(true);
    expect(isStemsketchFileName("models/projectile.physics")).toBe(true);
    expect(isPhysicsSource("physics 0.1\nframe world { type: inertial }")).toBe(true);
    expect(physicsCompletions("sim")).toContain("simulate");
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      contributes: { commands: Array<{ command: string }>; jsonValidation: unknown[] };
    };
    const contributed = manifest.contributes.commands.map((command) => command.command);
    expect(contributed.sort()).toEqual(Object.values(COMMANDS).sort());
    expect(manifest.contributes.jsonValidation.length).toBeGreaterThan(0);
  });

  it("lets an author validate, compile, preview, and navigate a STEMSketch file", async () => {
    const calls: Array<{ url: string; body?: string; authorization?: string }> = [];
    const studio = new AuthorStudio(mockClient(calls));
    const text = knowledgeText();

    const valid = studio.validate(text);
    expect(valid.ok).toBe(true);
    expect(valid.diagnostics).toEqual([]);

    const broken = studio.validate(
      JSON.stringify({
        kind: "stemsketch.knowledge",
        version: "0.2.0",
        id: "knowledge.bad",
        nodes: [{ id: "bad", kind: "knowledge.unknown", version: "0.2.0" }],
      }),
    );
    expect(broken.ok).toBe(false);
    expect(broken.diagnostics.some((issue) => issue.code === KnowledgeCodes.KN_INVALID_NODE)).toBe(
      true,
    );

    expect(await studio.connect()).toBe("connected");
    const job = await studio.compile(text);
    expect(job.status).toBe("succeeded");
    expect(job.compiled).toBe(true);
    const preview = studio.preview();
    expect(preview.ok).toBe(true);
    expect(preview.body).toContain("stemsketch.view");
    expect(studio.gotoNode(text, "concept.projectile-motion").path).toBeDefined();
    expect(calls.some((call) => call.url.endsWith("/api/v1/compile"))).toBe(true);
    expect(calls.every((call) => !call.body?.includes("user-session"))).toBe(true);
    expect(calls.some((call) => call.authorization === "Bearer user-session")).toBe(true);
  });

  it("activates VS Code commands without embedding compiler or secrets", async () => {
    const calls: Array<{ url: string; body?: string; authorization?: string }> = [];
    const { api, messages, commands } = fakeVscode(knowledgeText());
    const studio = activateWith(api, fakeContext(), mockClient(calls));
    expect(commands.has(COMMANDS.validate)).toBe(true);
    expect(commands.has(COMMANDS.compile)).toBe(true);
    expect(commands.has(COMMANDS.aiGenerate)).toBe(true);
    await commands.get(COMMANDS.validate)?.();
    await commands.get(COMMANDS.aiGenerate)?.();
    await commands.get(COMMANDS.compile)?.();
    await commands.get(COMMANDS.preview)?.();
    await commands.get(COMMANDS.gotoNode)?.();

    expect(studio.lastJob?.status).toBe("succeeded");
    expect(messages.some((message) => message.includes("valid"))).toBe(true);
    expect(messages.some((message) => message.includes("compile succeeded"))).toBe(true);
    expect(messages.some((message) => message.includes("concept.projectile-motion"))).toBe(true);

    const sources = readdirSync(join(root, "src"), { encoding: "utf8" });
    for (const file of sources) {
      const text = readFileSync(join(root, "src", file), "utf8");
      expect(text.includes("compiler-viewdeck") || text.includes("compiler-core")).toBe(false);
      expect(text.includes("STEMSKETCH_AI_API_KEY") || text.includes("sk-test")).toBe(false);
    }
    const manifest = readFileSync(join(root, "package.json"), "utf8");
    expect(manifest.includes("STEMSKETCH_AI_API_KEY")).toBe(false);
  });

  it("generates IR through mocked AI, then rejects invalid output", async () => {
    const calls: Array<{ url: string; body?: string; authorization?: string }> = [];
    const studio = new AuthorStudio(mockClient(calls));
    const generated = await studio.runWorkflow("generate", { intent: "projectile", compile: true });
    expect(generated.accepted).toBe(true);
    expect(studio.preview().ok).toBe(true);
    expect(studio.preview().body).toContain("stemsketch.view");
    const rejected = await studio.runWorkflow("generate", { intent: "corrupt please" });
    expect(rejected.accepted).toBe(false);
    const repaired = await studio.runWorkflow("repair", { intent: "repair", compile: true });
    expect(repaired.accepted).toBe(true);
  });

  it("checks every canonical document kind with the IR package that owns it", () => {
    const cases: Array<[string, string]> = [
      ["knowledge-ir/examples/projectile-knowledge.json", "stemsketch.knowledge"],
      ["artifact-ir/examples/projectile-artifacts.json", "stemsketch.artifact"],
      ["layout-ir/examples/projectile-fbd-layout.json", "stemsketch.layout"],
      ["scene-ir/examples/projectile-fbd-scene.json", "stemsketch.scene"],
      ["view-ir/examples/projectile-fbd-view.json", "stemsketch.view"],
      ["viewdeck-ir/examples/projectile-viewdeck.json", "stemsketch.viewdeck"],
      ["transition-ir/examples/identity-transition.json", "stemsketch.transition"],
      ["physics-ir/examples/projectile-physics.json", "stemsketch.physics"],
    ];
    const studio = new AuthorStudio(mockClient([]));
    for (const [path, kind] of cases) {
      const text = JSON.stringify(readJson(path));
      const result = studio.validate(text);
      expect(
        result.diagnostics.filter((issue) => issue.severity === "error"),
        kind,
      ).toEqual([]);
      expect(result.ok, kind).toBe(true);
    }
    const timeline = {
      kind: "stemsketch.presentation-timeline",
      version: "0.1.0",
      id: "timeline.t",
      view: "view.v",
      durationMs: 1000,
      cameras: [],
      variables: [],
      tracks: [],
      actions: [
        {
          id: "a",
          effect: "fade-in",
          target: { kind: "presentation", ref: "p" },
          startMs: 0,
          durationMs: 500,
        },
      ],
      groups: [],
      bindings: [],
      systemClips: [],
    };
    expect(studio.validate(JSON.stringify(timeline)).ok).toBe(true);
    expect(
      studio.validate(JSON.stringify({ ...timeline, actions: [{ id: "a", effect: "nope" }] })).ok,
    ).toBe(false);
    expect(studio.validate(JSON.stringify({ kind: "stemsketch.nonsense", version: "1" })).ok).toBe(
      false,
    );
  });

  it("validates a compilation unit as a whole, including ids shared between documents", () => {
    const studio = new AuthorStudio(mockClient([]));
    const unit = {
      knowledge: readJson("knowledge-ir/examples/projectile-knowledge.json"),
      artifacts: readJson("artifact-ir/examples/projectile-artifacts.json"),
      layout: readJson("layout-ir/examples/projectile-fbd-layout.json"),
      scene: readJson("scene-ir/examples/projectile-fbd-scene.json"),
      view: readJson("view-ir/examples/projectile-fbd-view.json"),
    };
    expect(studio.validate(JSON.stringify(unit)).ok).toBe(true);
    const clash = JSON.parse(JSON.stringify(unit)) as typeof unit & {
      layout: { nodes: { id: string }[] };
      scene: { nodes: { id: string }[] };
    };
    const first = clash.layout.nodes[0];
    if (first) first.id = clash.scene.nodes[0]?.id ?? first.id;
    expect(studio.validate(JSON.stringify(clash)).ok).toBe(false);
  });
});
