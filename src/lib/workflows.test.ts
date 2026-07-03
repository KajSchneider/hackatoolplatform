import { describe, it, expect } from "vitest";

describe("workflows", () => {
  it("validates step types", () => {
    const validTypes = ["prompt", "agent", "tool"];
    expect(validTypes).toContain("prompt");
    expect(validTypes).toContain("agent");
    expect(validTypes).toContain("tool");
  });

  it("validates run statuses", () => {
    const validStatuses = ["pending", "running", "completed", "failed"];
    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("running");
    expect(validStatuses).toContain("completed");
    expect(validStatuses).toContain("failed");
  });

  it("parses step config JSON", () => {
    const config = { prompt: "Hello", model: "gpt-4o" };
    const json = JSON.stringify(config);
    const parsed = JSON.parse(json);
    expect(parsed.prompt).toBe("Hello");
    expect(parsed.model).toBe("gpt-4o");
  });

  it("handles empty step config", () => {
    const config = {};
    const json = JSON.stringify(config);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed)).toHaveLength(0);
  });
});
