"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Trash2, Plus, Share2, Lock } from "lucide-react";

type BotItem = { id: string; name: string; description: string | null; model: string; shared: boolean };
type ModelItem = { id: string; label: string };

export default function BotManager({
  teamSlug,
  bots,
  customModels = [],
}: {
  teamSlug: string;
  bots: BotItem[];
  customModels?: ModelItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState(customModels[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/teams/${teamSlug}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined, systemPrompt, model }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Chatbot aanmaken mislukt");
      return;
    }
    setName("");
    setDescription("");
    setSystemPrompt("");
    router.refresh();
  }

  async function onDelete(id: string) {
    await fetch(`/api/teams/${teamSlug}/bots/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function onToggleShare(id: string, currentShared: boolean) {
    const res = await fetch(`/api/teams/${teamSlug}/bots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shared: !currentShared }),
    });
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {bots.length === 0 && <p className="text-sm text-slate-500">Nog geen chatbots.</p>}
        {bots.map((b) => (
          <div key={b.id} className="card flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-accent-500" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{b.name}</p>
                  {b.shared && <Share2 className="h-3 w-3 text-blue-500" />}
                </div>
                <p className="text-xs text-slate-500">
                  {b.model}
                  {b.description ? ` · ${b.description}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onToggleShare(b.id, b.shared)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-950 hover:text-blue-400"
                title={b.shared ? "Delen uit" : "Delen met team"}
              >
                {b.shared ? <Lock className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onDelete(b.id)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950 hover:text-red-400"
                title="Verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="font-semibold">Chatbot aanmaken</h2>
        <input
          className="input"
          type="text"
          placeholder="Naam (bv. Support Assistent)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input"
          type="text"
          placeholder="Korte beschrijving (optioneel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          className="input min-h-28"
          placeholder="Systeem-prompt: beschrijf de rol en het gedrag van de bot..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
        />
        <select
          className="input"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={customModels.length === 0}
        >
          {customModels.length === 0 ? (
            <option value="">Geen modellen — configureer een AI Endpoint</option>
          ) : (
            customModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))
          )}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Bezig..." : "Aanmaken"}
        </button>
      </form>
    </div>
  );
}
