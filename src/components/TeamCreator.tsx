"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function TeamCreator() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Team aanmaken mislukt");
      return;
    }
    const data = await res.json();
    router.push(`/t/${data.slug}/chat`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h2 className="font-semibold">Nieuw team</h2>
      <div className="mt-3 flex gap-3">
        <input
          className="input"
          type="text"
          placeholder="Teamnaam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary shrink-0" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Bezig..." : "Aanmaken"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  );
}
