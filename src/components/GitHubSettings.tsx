"use client";

import { useState } from "react";
import { Github, Check, X, ExternalLink } from "lucide-react";

interface GitHubConnection {
  id: string;
  owner: string;
  repo: string;
  branch: string;
}

interface GitHubSettingsProps {
  projectId: string;
  teamSlug: string;
  groupSlug: string;
  connections: GitHubConnection[];
}

export default function GitHubSettings({
  projectId,
  teamSlug,
  groupSlug,
  connections,
}: GitHubSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/teams/${teamSlug}/projects/${projectId}/github`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, branch, accessToken: token }),
        }
      );
      if (res.ok) {
        setIsOpen(false);
        setOwner("");
        setRepo("");
        setBranch("main");
        setToken("");
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Verbinding mislukt");
      }
    } catch {
      setError("Verbinding mislukt");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("GitHub repository ontkoppelen?")) return;
    const res = await fetch(
      `/api/teams/${teamSlug}/projects/${projectId}/github/${connectionId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      window.location.reload();
    }
  };

  const connected = connections.length > 0;
  const conn = connections[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded px-3 py-1 text-sm ${
          connected
            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-brand-500 dark:text-slate-300"
        }`}
      >
        <Github className="h-4 w-4" />
        {connected ? `${conn.owner}/${conn.repo}` : "GitHub koppelen"}
        {connected && <Check className="h-3 w-3" />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-96 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-brand-500 dark:bg-brand-600">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">GitHub Deploy Configuratie</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            {connected ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Verbonden met GitHub
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                    <div className="font-medium">{conn.owner}/{conn.repo}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500">Branch: {conn.branch}</div>
                  </div>
                  <a
                    href={`https://github.com/${conn.owner}/${conn.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Bekijk op GitHub
                  </a>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  Bij deploy worden je projectbestanden naar deze repo gepusht
                  en GitHub Pages wordt ingeschakeld.
                </p>
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  className="w-full rounded bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                >
                  Ontkoppelen
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">
                  Koppel een GitHub repository. Bij deploy worden je projectbestanden gepusht naar deze repo
                  en GitHub Pages wordt ingeschakeld.
                </p>
                <form onSubmit={handleConnect} className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">GitHub Owner *</label>
                    <input
                      type="text"
                      placeholder="bijv. mijn-gebruikersnaam"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Repository naam *</label>
                    <input
                      type="text"
                      placeholder="bijv. mijn-hackathon-project"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Branch</label>
                    <input
                      type="text"
                      placeholder="main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                      GitHub Personal Access Token *
                    </label>
                    <input
                      type="password"
                      placeholder="ghp_..."
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      className="input"
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
                      Token heeft 'repo' scope nodig. Wordt versleuteld opgeslagen.
                    </p>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? "Bezig..." : "Verbinden"}
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
