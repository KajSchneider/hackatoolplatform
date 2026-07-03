import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateOAuthState, verifyOAuthState, OAUTH_STATE_COOKIE } from "./oauth-state";

describe("oauth-state", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-for-hmac";
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it("exports the cookie name", () => {
    expect(OAUTH_STATE_COOKIE).toBe("netlify_oauth_state");
  });

  describe("generateOAuthState", () => {
    it("returns a 64-char hex state and a cookie value", () => {
      const { state, cookieValue } = generateOAuthState();
      expect(state).toMatch(/^[a-f0-9]{64}$/);
      expect(cookieValue).toContain(state);
      expect(cookieValue.split(".")).toHaveLength(2);
    });

    it("generates unique states", () => {
      const a = generateOAuthState();
      const b = generateOAuthState();
      expect(a.state).not.toBe(b.state);
      expect(a.cookieValue).not.toBe(b.cookieValue);
    });
  });

  describe("verifyOAuthState", () => {
    it("validates a correct state + cookie pair", () => {
      const { state, cookieValue } = generateOAuthState();
      expect(verifyOAuthState(state, cookieValue)).toBe(true);
    });

    it("rejects a wrong state", () => {
      const { cookieValue } = generateOAuthState();
      expect(verifyOAuthState("deadbeef", cookieValue)).toBe(false);
    });

    it("rejects a tampered cookie", () => {
      const { state, cookieValue } = generateOAuthState();
      const [, hmac] = cookieValue.split(".");
      const tampered = `${state}.deadbeef`;
      expect(verifyOAuthState(state, tampered)).toBe(false);
    });

    it("rejects a malformed cookie", () => {
      expect(verifyOAuthState("abc", "malformed")).toBe(false);
      expect(verifyOAuthState("abc", "")).toBe(false);
    });

    it("rejects when secrets differ", () => {
      const { state, cookieValue } = generateOAuthState();
      process.env.AUTH_SECRET = "different-secret";
      expect(verifyOAuthState(state, cookieValue)).toBe(false);
    });
  });
});
