import { describe, it, expect } from "vitest";

describe("projects", () => {
  it("generates valid slugs from project names", () => {
    const slugify = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);

    expect(slugify("My App")).toBe("my-app");
    expect(slugify("App 123")).toBe("app-123");
    expect(slugify("App!! Test")).toBe("app-test");
    expect(slugify("a".repeat(100))).toHaveLength(40);
  });

  it("validates GitHub repo formats", () => {
    const isValidRepo = (repo: string) => /^[a-zA-Z0-9_.-]+$/.test(repo);
    expect(isValidRepo("my-repo")).toBe(true);
    expect(isValidRepo("my_repo")).toBe(true);
    expect(isValidRepo("my.repo")).toBe(true);
    expect(isValidRepo("my repo")).toBe(false);
    expect(isValidRepo("my/repo")).toBe(false);
  });

  it("validates GitHub owner formats", () => {
    const isValidOwner = (owner: string) => /^[a-zA-Z0-9-]+$/.test(owner);
    expect(isValidOwner("username")).toBe(true);
    expect(isValidOwner("org-name")).toBe(true);
    expect(isValidOwner("user_name")).toBe(false);
    expect(isValidOwner("user.name")).toBe(false);
  });
});
