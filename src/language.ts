import { validatePhysicsSource } from "@stemsketch/compiler-physics";
import type { Diagnostic } from "@stemsketch/schema";

export function isPhysicsSource(text: string): boolean {
  return /^\s*physics\b/.test(text);
}

export function validatePhysicsLanguage(text: string): { ok: boolean; diagnostics: Diagnostic[] } {
  return validatePhysicsSource(text);
}

export function physicsCompletions(prefix: string): string[] {
  const keywords = [
    "physics",
    "use",
    "frame",
    "body",
    "gravity",
    "force",
    "apply",
    "simulate",
    "visualize",
    "show",
    "trajectory",
    "velocity",
    "acceleration",
    "rigid-body",
    "inertial",
  ];
  const needle = prefix.trim().toLowerCase();
  return keywords.filter((word) => word.startsWith(needle));
}
