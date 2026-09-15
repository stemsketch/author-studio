export function isStemsketchWorkspace(entryNames: readonly string[]): boolean {
  return entryNames.some(
    (name) =>
      name === ".stemsketch" || name === "stemsketch.json" || name.endsWith(".stemsketch.json"),
  );
}

export function isStemsketchFileName(fileName: string): boolean {
  const normalized = fileName.replaceAll("\\", "/");
  return (
    normalized.endsWith(".stemsketch.json") ||
    normalized.includes("/.stemsketch/") ||
    normalized.endsWith("/stemsketch.json")
  );
}
