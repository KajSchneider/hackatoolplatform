import { describe, it, expect } from "vitest";
import { encrypt, decrypt, maskKey } from "./crypto";

describe("crypto", () => {
  it("round-trips a value through encrypt/decrypt", () => {
    const secret = "sk-test-1234567890abcdef";
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(decrypt(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const secret = "same-input";
    expect(encrypt(secret)).not.toBe(encrypt(secret));
  });

  it("fails to decrypt a tampered payload", () => {
    const encrypted = encrypt("hello");
    const [iv, tag, data] = encrypted.split(":");
    const tampered = [iv, tag, data.slice(0, -2) + "00"].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("treats non-encrypted values as legacy plaintext", () => {
    const plaintext = "ais.aW9sbmV0ZWNo.Avb6x0Jl";
    expect(decrypt(plaintext)).toBe(plaintext);
  });

  it("masks keys, hiding the middle", () => {
    expect(maskKey("sk-abcdefghijklmnop")).toBe("sk-a••••mnop");
    expect(maskKey("short")).toBe("••••");
  });
});
