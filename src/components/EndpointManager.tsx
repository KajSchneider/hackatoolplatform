"use client";

import { useState } from "react";

interface Endpoint {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string | null;
  models: string[];
  createdAt: string;
}

interface EndpointManagerProps {
  teamSlug: string;
  endpoints: Endpoint[];
}

export default function EndpointManager({ teamSlug, endpoints }: EndpointManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState("");
  const [isConnectingBazaar, setIsConnectingBazaar] = useState(false);
  const [bazaarError, setBazaarError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const modelsArray = models.split(",").map(m => m.trim()).filter(m => m);
    
    const url = editingId 
      ? `/api/teams/${teamSlug}/endpoints/${editingId}`
      : `/api/teams/${teamSlug}/endpoints`;
    
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, provider, baseUrl, apiKey, models: modelsArray }),
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleEdit = (endpoint: Endpoint) => {
    setEditingId(endpoint.id);
    setName(endpoint.name);
    setProvider(endpoint.provider);
    setBaseUrl(endpoint.baseUrl);
    setApiKey(""); // Reset to empty so user can enter new key or leave empty to keep existing
    setModels(endpoint.models.join(", "));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setProvider("openai");
    setBaseUrl("");
    setApiKey("");
    setModels("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this endpoint?")) return;
    const res = await fetch(`/api/teams/${teamSlug}/endpoints/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleConnectBazaar = async () => {
    setIsConnectingBazaar(true);
    setBazaarError(null);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/endpoints/bazaarlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setBazaarError(data.error || "Verbinding mislukt");
      }
    } catch {
      setBazaarError("Kon niet verbinden met Bazaarlink");
    } finally {
      setIsConnectingBazaar(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            Add Custom Endpoint
          </button>
          <button
            onClick={handleConnectBazaar}
            disabled={isConnectingBazaar}
            className="rounded bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {isConnectingBazaar ? "Verbinden..." : "Connect Bazaarlink"}
          </button>
          {bazaarError && (
            <span className="self-center text-sm text-red-500">{bazaarError}</span>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 rounded border bg-white p-4 shadow-sm dark:bg-brand-600">
          <h3 className="font-semibold">{editingId ? "Edit Endpoint" : "Add Custom Endpoint"}</h3>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500"
              placeholder="My Custom API"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500"
            >
              <option value="openai">OpenAI-compatible</option>
              <option value="anthropic">Anthropic-compatible</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500"
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">API Key (optional)</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Available Models (comma-separated)</label>
            <input
              value={models}
              onChange={(e) => setModels(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500"
              placeholder="gpt-4o, gpt-4o-mini, gpt-5.4"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {endpoints.map((endpoint) => (
          <div
            key={endpoint.id}
            className="flex items-center justify-between rounded border bg-white p-4 shadow-sm dark:bg-brand-600"
          >
            <div>
              <div className="font-semibold">{endpoint.name}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                {endpoint.provider} - {endpoint.baseUrl}
              </div>
              {endpoint.apiKey && (
                <div className="text-xs text-gray-500 dark:text-slate-500">
                  Key: {endpoint.apiKey}
                </div>
              )}
              {endpoint.models.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-slate-500">
                  Models: {endpoint.models.join(", ")}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(endpoint)}
                className="text-blue-500 hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(endpoint.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {endpoints.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 dark:text-slate-500">
            No custom endpoints configured.
          </p>
        )}
      </div>
    </div>
  );
}
