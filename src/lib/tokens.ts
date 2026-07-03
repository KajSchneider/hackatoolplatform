import crypto from "crypto";

export function generateToken(): { token: string; prefix: string; tokenHash: string } {
  const token = `hk_${crypto.randomBytes(24).toString("hex")}`;
  return { token, prefix: token.slice(0, 7), tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
