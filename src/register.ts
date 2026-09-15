import type { Diagnostic as IrDiagnostic } from "@stemsketch/schema";

import { COMMANDS } from "./identity.js";
import { parseJsonDocument } from "./document.js";
import { AuthorStudio, connectionLabel } from "./studio.js";
import { isStemsketchWorkspace } from "./workspace.js";

export interface DisposableLike {
  dispose(): void;
}

export interface SecretStorageLike {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
}

export interface ExtensionContextLike {
  subscriptions: DisposableLike[];
  secrets: SecretStorageLike;
}

export interface StatusBarItemLike extends DisposableLike {
  text: string;
  tooltip?: string;
  command?: string;
  show(): void;
}

export interface DiagnosticCollectionLike extends DisposableLike {
  set(uri: unknown, diagnostics: unknown[]): void;
  clear(): void;
}

export interface TextDocumentLike {
  fileName: string;
  getText(): string;
  uri: unknown;
}

export interface VscodeLike {
  StatusBarAlignment: { Left: number };
  DiagnosticSeverity: { Error: number; Warning: number; Information: number };
  window: {
    activeTextEditor?: { document: TextDocumentLike };
    createStatusBarItem(alignment: number, priority?: number): StatusBarItemLike;
    showErrorMessage(message: string): Thenable<unknown>;
    showInformationMessage(message: string): Thenable<unknown>;
    showInputBox(options: { prompt: string }): Thenable<string | undefined>;
    createWebviewPanel?(
      viewType: string,
      title: string,
      column: number,
      options: { enableScripts: boolean },
    ): { webview: { html: string } };
  };
  commands: {
    registerCommand(command: string, callback: (...args: unknown[]) => unknown): DisposableLike;
  };
  languages: {
    createDiagnosticCollection(name: string): DiagnosticCollectionLike;
  };
  workspace: {
    workspaceFolders?: ReadonlyArray<{ name: string; uri: { fsPath: string } }>;
    getConfiguration(section: string): { get<T>(key: string, defaultValue: T): T };
  };
  Diagnostic: new (range: unknown, message: string, severity: number) => unknown;
  Range: new (start: unknown, end: unknown) => unknown;
  Position: new (line: number, character: number) => unknown;
  ViewColumn?: { Beside: number };
}

function currentText(
  api: VscodeLike,
): { text: string; uri: unknown; fileName: string } | undefined {
  const editor = api.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  return {
    text: editor.document.getText(),
    uri: editor.document.uri,
    fileName: editor.document.fileName,
  };
}

function toVsDiagnostics(api: VscodeLike, diagnostics: IrDiagnostic[]): unknown[] {
  return diagnostics.map((issue) => {
    const severity =
      issue.severity === "warning" ? api.DiagnosticSeverity.Warning : api.DiagnosticSeverity.Error;
    return new api.Diagnostic(
      new api.Range(new api.Position(0, 0), new api.Position(0, 1)),
      issue.message,
      severity,
    );
  });
}

function previewHtml(body: string): string {
  const escaped = body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!DOCTYPE html><html><body><pre>${escaped}</pre></body></html>`;
}

export function registerAuthorStudio(
  api: VscodeLike,
  context: ExtensionContextLike,
  studio: AuthorStudio,
): { studio: AuthorStudio } {
  const status = api.window.createStatusBarItem(api.StatusBarAlignment.Left, 100);
  status.command = COMMANDS.connect;
  status.text = connectionLabel(studio.connection);
  status.show();
  context.subscriptions.push(status);

  const collection = api.languages.createDiagnosticCollection("stemsketch");
  context.subscriptions.push(collection);

  const refreshStatus = () => {
    const folders = api.workspace.workspaceFolders ?? [];
    const names = folders.flatMap((folder) => [folder.name, ".stemsketch"]);
    status.tooltip = isStemsketchWorkspace(names)
      ? "STEMSketch workspace"
      : "Open a STEMSketch workspace";
    status.text = connectionLabel(studio.connection);
  };
  refreshStatus();

  const requireDocument = async () => {
    const current = currentText(api);
    if (!current) {
      await api.window.showErrorMessage("Open a STEMSketch file first");
      return undefined;
    }
    return current;
  };

  context.subscriptions.push(
    api.commands.registerCommand(COMMANDS.connect, async () => {
      const next = await studio.connect();
      if (next === "connected") {
        await api.window.showInformationMessage("Connected to Author Services");
      } else {
        await api.window.showErrorMessage("Could not connect to Author Services");
      }
      refreshStatus();
    }),
    api.commands.registerCommand(COMMANDS.validate, async () => {
      const current = await requireDocument();
      if (!current) {
        return;
      }
      const result = studio.validate(current.text);
      collection.set(current.uri, toVsDiagnostics(api, result.diagnostics));
      if (result.ok) {
        await api.window.showInformationMessage("STEMSketch document is valid");
      } else {
        await api.window.showErrorMessage(`${result.diagnostics.length} STEMSketch diagnostic(s)`);
      }
      return result;
    }),
    api.commands.registerCommand(COMMANDS.compile, async () => {
      const current = await requireDocument();
      if (!current) {
        return;
      }
      const job = await studio.compile(current.text);
      collection.set(current.uri, toVsDiagnostics(api, studio.lastDiagnostics));
      if (job.status === "succeeded") {
        await api.window.showInformationMessage("STEMSketch compile succeeded");
      } else {
        await api.window.showErrorMessage("STEMSketch compile failed");
      }
      return job;
    }),
    api.commands.registerCommand(COMMANDS.preview, async () => {
      const preview = studio.preview();
      if (!preview.ok) {
        await api.window.showErrorMessage(preview.diagnostics[0]?.message ?? "preview unavailable");
        return preview;
      }
      if (api.window.createWebviewPanel && api.ViewColumn) {
        const panel = api.window.createWebviewPanel(
          "stemsketch.preview",
          "STEMSketch Preview",
          api.ViewColumn.Beside,
          { enableScripts: false },
        );
        panel.webview.html = previewHtml(preview.body);
      } else {
        await api.window.showInformationMessage("STEMSketch preview ready");
      }
      return preview;
    }),
    api.commands.registerCommand(COMMANDS.gotoNode, async () => {
      const current = await requireDocument();
      if (!current) {
        return;
      }
      const nodeId = await api.window.showInputBox({ prompt: "Graph node id" });
      if (!nodeId) {
        return;
      }
      const found = studio.gotoNode(current.text, nodeId);
      if (!found.ok) {
        await api.window.showErrorMessage(found.diagnostics[0]?.message ?? "node not found");
        return found;
      }
      await api.window.showInformationMessage(`Located ${nodeId} at ${found.path}`);
      return found;
    }),
    api.commands.registerCommand(COMMANDS.aiGenerate, async () => {
      const intent = await api.window.showInputBox({ prompt: "Describe the IR to generate" });
      if (!intent) {
        return;
      }
      const result = await studio.runWorkflow("generate", { intent, compile: true });
      if (!result.accepted) {
        await api.window.showErrorMessage("AI output was rejected until it validates");
        return result;
      }
      const preview = studio.preview();
      if (preview.ok && api.window.createWebviewPanel && api.ViewColumn) {
        const panel = api.window.createWebviewPanel(
          "stemsketch.preview",
          "STEMSketch Preview",
          api.ViewColumn.Beside,
          { enableScripts: false },
        );
        panel.webview.html = previewHtml(preview.body);
      }
      await api.window.showInformationMessage("AI artifact validated, compiled, and previewed");
      return result;
    }),
    api.commands.registerCommand(COMMANDS.aiRepair, async () => {
      const current = await requireDocument();
      if (!current) {
        return;
      }
      const parsed = parseJsonDocument(current.text);
      if (!parsed.ok) {
        await api.window.showErrorMessage(parsed.diagnostics[0]?.message ?? "invalid JSON");
        return parsed;
      }
      const result = await studio.runWorkflow("repair", {
        intent: "repair",
        document: parsed.value,
        compile: true,
      });
      if (!result.accepted) {
        await api.window.showErrorMessage("Repaired IR was still invalid");
        return result;
      }
      await api.window.showInformationMessage("Repaired IR validated");
      return result;
    }),
    api.commands.registerCommand(COMMANDS.aiExplain, async () => {
      const intent = studio.lastDiagnostics[0]?.code ?? "diagnostic";
      const result = await studio.runWorkflow("explain", { intent });
      await api.window.showInformationMessage(result.text ?? "No explanation");
      return result;
    }),
  );

  return { studio };
}
