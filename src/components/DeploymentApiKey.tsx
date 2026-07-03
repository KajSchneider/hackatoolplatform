"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Copy, Check, Trash2 } from "lucide-react";

interface DeploymentApiKeyProps {
  teamSlug: string;
  groupSlug: string;
  projectId: string;
  deploymentId: string;
  hasApiKey: boolean;
}

export default function DeploymentApiKey({
  teamSlug,
  groupSlug,
  projectId,
  deploymentId,
  hasApiKey,
}: DeploymentApiKeyProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const baseUrl = `/api/teams/${teamSlug}/groups/${groupSlug}/projects/${projectId}/deployments/${deploymentId}/api-key`;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await fetch(baseUrl, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        router.refresh();
      } else {
        const error = await res.json();
        alert(`Fout: ${error.error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Weet je zeker dat je de public API key wilt intrekken?")) return;
    setBusy(true);
    try {
      const res = await fetch(baseUrl, { method: "DELETE" });
      if (res.ok) {
        setToken(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (token) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Public API key — wordt maar één keer getoond, kopieer nu:
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs dark:bg-brand-600">{token}</code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-brand-500 dark:hover:bg-brand-500"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied ? "Gekopieerd" : "Kopieer"}
          </button>
        </div>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Gebruik: <code>POST /api/v1/deploy/&lt;key&gt;/chat</code>
        </p>
      </div>
    );
  }

  if (hasApiKey) {
    return (
      <button
        onClick={handleRevoke}
        disabled={busy}
        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
        API key intrekken
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={busy}
      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-brand-500 dark:text-slate-300 dark:hover:bg-brand-500"
    >
      <Key className="h-4 w-4" />
      {busy ? "Bezig..." : "Public API key"}
    </button>
  );
}
