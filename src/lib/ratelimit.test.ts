import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./ratelimit";

describe("rate limiting", () => {
  it("allows requests within limit", () => {
    const result = checkRateLimit(`test-${Date.now()}-1`, 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests exceeding limit", () => {
    const id = `test-${Date.now()}-2`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(id, 5, 60000);
    }
    const result = checkRateLimit(id, 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("handles different identifiers separately", () => {
    const result1 = checkRateLimit(`test-${Date.now()}-3`, 1, 60000);
    const result2 = checkRateLimit(`test-${Date.now()}-4`, 1, 60000);
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });
});
