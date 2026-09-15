export const repositoryId = "author-studio" as const;
export const EXTENSION_ID = "stemsketch.author-studio" as const;

export function foundationReady(): boolean {
  return true;
}

export const COMMANDS = {
  validate: "stemsketch.validate",
  compile: "stemsketch.compile",
  preview: "stemsketch.preview",
  gotoNode: "stemsketch.gotoNode",
  connect: "stemsketch.connect",
  aiGenerate: "stemsketch.ai.generate",
  aiRepair: "stemsketch.ai.repair",
  aiExplain: "stemsketch.ai.explain",
} as const;

export type StudioCommand = (typeof COMMANDS)[keyof typeof COMMANDS];
