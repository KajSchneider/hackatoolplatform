"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2, Plus } from "lucide-react";

type KeyItem = { id: string; provider: string; label: string | null; createdAt: Date };

export default function KeyManager({ teamSlug, keys }: { teamSlug: string; keys: KeyItem[] }) {
  const router = useRouter();
  const [provider, setProvider] = useState("openai");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/teams/${teamSlug}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key, label }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Key opslaan mislukt");
      return;
    }
    setKey("");
    setLabel("");
    router.refresh();
  }

  async function onDelete(id: string) {
    await fetch(`/api/teams/${teamSlug}/keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {keys.length === 0 && (
          <p className="text-sm text-slate-500">Nog geen API keys toegevoegd.</p>
        )}
        {keys.map((k) => (
          <div key={k.id} className="card flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-accent-500" />
              <div>
                <p className="text-sm font-medium capitalize">{k.provider}</p>
                <p className="text-xs text-slate-500">{k.label || "Geen label"}</p>
              </div>
            </div>
            <button
              onClick={() => onDelete(k.id)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950 hover:text-red-400"
              title="Verwijderen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="font-semibold">Key toevoegen</h2>
        <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <input
          className="input"
          type="password"
          placeholder="API key (sk-...)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
        />
        <input
          className="input"
          type="text"
          placeholder="Label (optioneel)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Bezig..." : "Opslaan"}
        </button>
        <p className="text-xs text-slate-500">
          Keys worden versleuteld opgeslagen (AES-256-GCM) en zijn alleen voor dit team bruikbaar.
        </p>
      </form>
    </div>
  );
}
