import { generateToken, hashToken } from "@/lib/tokens";

export const MAX_DEPLOYMENTS_PER_USER = 25;

export const DEPLOYMENT_STATUSES = ["pending", "deploying", "deployed", "failed"] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export function isValidDeploymentStatus(status: string): status is DeploymentStatus {
  return (DEPLOYMENT_STATUSES as readonly string[]).includes(status);
}

/** Generates a public deploy API key (hk_deploy_*) and its SHA-256 hash for storage. */
export function generateDeployKey(): { token: string; tokenHash: string } {
  const { token } = generateToken();
  const deployToken = `hk_deploy_${token.slice(3)}`;
  return { token: deployToken, tokenHash: hashToken(deployToken) };
}

/** Picks the best public URL from a Netlify deploy response. */
export function pickNetlifyUrl(deployData: {
  ssl_url?: string | null;
  url?: string | null;
  deploy_url?: string | null;
}): string | null {
  return deployData.ssl_url || deployData.url || deployData.deploy_url || null;
}
