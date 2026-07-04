import { describe, it, expect } from "vitest";
import {
  MAX_DEPLOYMENTS_PER_USER,
  isValidDeploymentStatus,
  generateDeployKey,
} from "./deployments";
import { hashToken } from "./tokens";

describe("deployments", () => {
  it("has a deployment limit of 25 per user", () => {
    expect(MAX_DEPLOYMENTS_PER_USER).toBe(25);
  });

  describe("isValidDeploymentStatus", () => {
    it("accepts known statuses", () => {
      for (const status of ["pending", "deploying", "deployed", "failed"]) {
        expect(isValidDeploymentStatus(status)).toBe(true);
      }
    });

    it("rejects unknown statuses", () => {
      expect(isValidDeploymentStatus("live")).toBe(false);
      expect(isValidDeploymentStatus("")).toBe(false);
    });
  });

  describe("generateDeployKey", () => {
    it("generates a token with hk_deploy_ prefix", () => {
      const { token } = generateDeployKey();
      expect(token.startsWith("hk_deploy_")).toBe(true);
    });

    it("hash matches sha256 of the token", () => {
      const { token, tokenHash } = generateDeployKey();
      expect(tokenHash).toBe(hashToken(token));
    });

    it("generates unique tokens", () => {
      const a = generateDeployKey();
      const b = generateDeployKey();
      expect(a.token).not.toBe(b.token);
      expect(a.tokenHash).not.toBe(b.tokenHash);
    });
  });

});
