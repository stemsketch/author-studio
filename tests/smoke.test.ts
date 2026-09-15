import { describe, expect, it } from "vitest";

import { foundationReady, repositoryId } from "../src/index.js";

describe("phase 0 foundation", () => {
  it("identifies the repository", () => {
    expect(repositoryId).toBe("author-studio");
  });

  it("reports foundation ready", () => {
    expect(foundationReady()).toBe(true);
  });
});
