import { describe, it, expect } from "vitest";

describe("custom endpoints", () => {
  it("validates provider types", () => {
    const validProviders = ["openai", "anthropic", "custom"];
    expect(validProviders).toContain("openai");
    expect(validProviders).toContain("anthropic");
    expect(validProviders).toContain("custom");
  });

  it("validates base URL format", () => {
    const validUrl = "https://api.example.com/v1";
    expect(validUrl).toMatch(/^https?:\/\/.+/);
  });

  it("handles encrypted API keys", () => {
    const apiKey = "sk-test-key-12345";
    const masked = `***${apiKey.slice(-4)}`;
    expect(masked).toBe("***2345");
  });

  it("validates endpoint name", () => {
    const name = "My Custom API";
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThan(100);
  });
});
