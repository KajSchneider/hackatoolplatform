"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeySquare, Trash2, Plus, Copy, Check } from "lucide-react";

type TokenItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export default function TokenManager({
  teamSlug,
  tokens,
}: {
  teamSlug: string;
  tokens: TokenItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/teams/${teamSlug}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Token aanmaken mislukt");
      return;
    }
    const data = await res.json();
    setNewToken(data.token);
    setName("");
    router.refresh();
  }

  async function onCopy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onDelete(id: string) {
    await fetch(`/api/teams/${teamSlug}/tokens/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {newToken && (
        <div className="card border-brand-500">
          <p className="text-sm font-medium text-accent-500">
            Token aangemaakt — kopieer hem nu, hij wordt niet opnieuw getoond:
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 text-xs">
              {newToken}
            </code>
            <button onClick={onCopy} className="btn-secondary shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tokens.length === 0 && <p className="text-sm text-slate-500">Nog geen tokens.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="card flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <KeySquare className="h-5 w-5 text-accent-500" />
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-slate-500">
                  {t.prefix}··· · aangemaakt {new Date(t.createdAt).toLocaleDateString("nl-NL")}
                  {t.lastUsedAt
                    ? ` · laatst gebruikt ${new Date(t.lastUsedAt).toLocaleDateString("nl-NL")}`
                    : " · nog niet gebruikt"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDelete(t.id)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950 hover:text-red-400"
              title="Verwijderen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card flex items-end gap-3">
        <div className="flex-1">
          <h2 className="font-semibold">Nieuw token</h2>
          <input
            className="input mt-3"
            type="text"
            placeholder="Naam (bv. productie-app)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary shrink-0" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Bezig..." : "Aanmaken"}
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
