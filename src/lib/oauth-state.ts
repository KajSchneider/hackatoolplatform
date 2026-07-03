import crypto from "crypto";

/**
 * Generate a random OAuth state parameter and a signed cookie value.
 * The cookie is `state.hmac` so we can verify the state on callback.
 */
export function generateOAuthState(): { state: string; cookieValue: string } {
  const state = crypto.randomBytes(32).toString("hex");
  const secret = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "fallback";
  const hmac = crypto.createHmac("sha256", secret).update(state).digest("hex");
  return { state, cookieValue: `${state}.${hmac}` };
}

/**
 * Validate an OAuth state against the signed cookie value.
 * Returns true if the state matches and the HMAC is valid.
 */
export function verifyOAuthState(state: string, cookieValue: string): boolean {
  const [cookieState, cookieHmac] = cookieValue.split(".");
  if (!cookieState || !cookieHmac) return false;
  if (cookieState !== state) return false;

  const secret = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "fallback";
  const expectedHmac = crypto.createHmac("sha256", secret).update(state).digest("hex");
  const a = Buffer.from(cookieHmac);
  const b = Buffer.from(expectedHmac);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const OAUTH_STATE_COOKIE = "netlify_oauth_state";
