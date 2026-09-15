import * as vscode from "vscode";

import { activateWith } from "./activation.js";
import type { VscodeLike } from "./register.js";

export function activate(context: vscode.ExtensionContext): void {
  activateWith(vscode as unknown as VscodeLike, context);
}

export function deactivate(): void {}
