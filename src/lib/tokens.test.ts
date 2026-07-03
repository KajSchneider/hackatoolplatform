import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("generates a prefixed token with matching prefix and hash", () => {
    const { token, prefix, tokenHash } = generateToken();
    expect(token.startsWith("hk_")).toBe(true);
    expect(prefix).toBe(token.slice(0, 7));
    expect(tokenHash).toBe(hashToken(token));
  });

  it("generates unique tokens", () => {
    expect(generateToken().token).not.toBe(generateToken().token);
  });

  it("hashes deterministically (sha256 hex)", () => {
    const hash = hashToken("hk_example");
    expect(hash).toBe(hashToken("hk_example"));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
