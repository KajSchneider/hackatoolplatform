import { describe, it, expect } from "vitest";
import { slugify } from "./teams";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("My Team")).toBe("my-team");
  });

  it("strips special characters", () => {
    expect(slugify("Team #1 (prod)!")).toBe("team-1-prod");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("falls back to 'team' for empty input", () => {
    expect(slugify("!!!")).toBe("team");
    expect(slugify("")).toBe("team");
  });

  it("caps length at 40 chars", () => {
    expect(slugify("a".repeat(100)).length).toBe(40);
  });
});
