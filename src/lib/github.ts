import { decrypt } from "@/lib/crypto";

interface GitHubConnection {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  accessToken: string; // encrypted
}

interface ProjectFile {
  path: string;
  content: string;
}

/**
 * Push project files to a GitHub repository using the Git Database API.
 * Creates a commit on the specified branch with all files.
 * Returns the commit SHA.
 *
 * Steps:
 * 1. Get the current branch's commit SHA (or create branch from default)
 * 2. Get the tree SHA of that commit
 * 3. Create a new tree with all project files
 * 4. Create a commit pointing to the new tree
 * 5. Update the branch ref to point to the new commit
 */
export async function pushToGitHub(
  connection: GitHubConnection,
  files: ProjectFile[]
): Promise<{ commitSha: string; commitUrl: string }> {
  const token = decrypt(connection.accessToken);
  const { owner, repo, branch } = connection;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Check if the branch already exists
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    { headers }
  );

  if (branchRes.ok) {
    // Branch exists — use Git Database API for atomic commit
    const branchData = await branchRes.json();
    const parentCommitSha = branchData.commit.sha;
    const baseTreeSha = branchData.commit.commit.tree.sha;

    // Create a new tree with all project files
    const treeItems = files.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content,
    }));

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      }
    );

    if (!treeRes.ok) {
      const err = await treeRes.json();
      throw new Error(`Failed to create tree: ${err.message}`);
    }

    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // Create a commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Deploy from Hackatool — ${new Date().toISOString()}`,
          tree: newTreeSha,
          parents: [parentCommitSha],
        }),
      }
    );

    if (!commitRes.ok) {
      const err = await commitRes.json();
      throw new Error(`Failed to create commit: ${err.message}`);
    }

    const commitData = await commitRes.json();
    const commitSha = commitData.sha;

    // Update the branch ref
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ sha: commitSha, force: true }),
      }
    );

    if (!refRes.ok) {
      const err = await refRes.json();
      throw new Error(`Failed to update branch ref: ${err.message}`);
    }

    return {
      commitSha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${commitSha}`,
    };
  }

  // Branch doesn't exist — use Contents API (works on empty repos too)
  // Push files one by one. The first file creates the branch automatically.
  let lastCommitSha = "";

  for (const file of files) {
    const contentRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Deploy from Hackatool — ${new Date().toISOString()}`,
          content: Buffer.from(file.content).toString("base64"),
          branch,
        }),
      }
    );

    if (!contentRes.ok) {
      const err = await contentRes.json();
      throw new Error(`Failed to push file ${file.path}: ${err.message}`);
    }

    const contentData = await contentRes.json();
    lastCommitSha = contentData.commit.sha;
  }

  return {
    commitSha: lastCommitSha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${lastCommitSha}`,
  };
}

/**
 * Enable GitHub Pages on a repository, using the connected branch as source.
 * Returns the Pages URL (may take a few minutes to be reachable after first enable).
 * If Pages is already enabled, just returns the existing URL.
 */
export async function enableGitHubPages(
  connection: GitHubConnection
): Promise<string | null> {
  const token = decrypt(connection.accessToken);
  const { owner, repo, branch } = connection;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Check if Pages is already enabled
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pages`,
    { headers }
  );

  if (checkRes.ok) {
    const pagesData = await checkRes.json();
    return pagesData.html_url || null;
  }

  // Pages not enabled — create it
  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pages`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          branch,
          path: "/",
        },
      }),
    }
  );

  if (createRes.ok) {
    const pagesData = await createRes.json();
    return pagesData.html_url || null;
  }

  // If 409 conflict, Pages already exists — fetch again
  if (createRes.status === 409) {
    const retryRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pages`,
      { headers }
    );
    if (retryRes.ok) {
      const pagesData = await retryRes.json();
      return pagesData.html_url || null;
    }
  }

  return null;
}
