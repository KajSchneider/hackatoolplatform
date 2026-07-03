"use client";

import { useState } from "react";
import { Server, Plus, Trash2, Edit, Power, X } from "lucide-react";

interface McpServerConfig {
  id: string;
  name: string;
  transportType: string;
  url: string | null;
  command: string | null;
  args: string | null;
  env: string | null;
  headers: string | null;
  enabled: boolean;
  createdAt: string;
}

interface McpServerManagerProps {
  teamSlug: string;
  servers: McpServerConfig[];
}

export default function McpServerManager({ teamSlug, servers }: McpServerManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [transportType, setTransportType] = useState("sse");
  const [url, setUrl] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [env, setEnv] = useState("");
  const [headers, setHeaders] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setTransportType("sse");
    setUrl("");
    setCommand("");
    setArgs("");
    setEnv("");
    setHeaders("");
    setError(null);
    setShowForm(false);
  };

  const handleEdit = (server: McpServerConfig) => {
    setEditingId(server.id);
    setName(server.name);
    setTransportType(server.transportType);
    setUrl(server.url || "");
    setCommand(server.command || "");
    setArgs(server.args ? JSON.parse(server.args).join(" ") : "");
    setEnv(server.env ? JSON.stringify(JSON.parse(server.env), null, 2) : "");
    setHeaders(server.headers ? JSON.stringify(JSON.parse(server.headers), null, 2) : "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name,
      transportType,
    };

    if (transportType === "sse") {
      payload.url = url;
      if (headers.trim()) {
        try {
          payload.headers = JSON.parse(headers);
        } catch {
          setError("Headers moeten geldige JSON zijn");
          setSaving(false);
          return;
        }
      }
    } else {
      payload.command = command;
      if (args.trim()) {
        payload.args = args.split(/\s+/).filter(Boolean);
      }
      if (env.trim()) {
        try {
          payload.env = JSON.parse(env);
        } catch {
          setError("Env moeten geldige JSON zijn");
          setSaving(false);
          return;
        }
      }
    }

    const api_url = editingId
      ? `/api/teams/${teamSlug}/mcp-servers/${editingId}`
      : `/api/teams/${teamSlug}/mcp-servers`;

    try {
      const res = await fetch(api_url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Opslaan mislukt");
      }
    } catch {
      setError("Netwerk fout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deze MCP server verwijderen?")) return;
    const res = await fetch(`/api/teams/${teamSlug}/mcp-servers/${id}`, {
      method: "DELETE",
    });
    if (res.ok) window.location.reload();
  };

  const handleToggle = async (server: McpServerConfig) => {
    const res = await fetch(`/api/teams/${teamSlug}/mcp-servers/${server.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !server.enabled }),
    });
    if (res.ok) window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            <Plus className="mr-1 inline h-4 w-4" />
            MCP Server toevoegen
          </button>
        ) : (
          <button
            onClick={resetForm}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Annuleren
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded border bg-white p-4 shadow-sm dark:bg-brand-600">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">
              {editingId ? "MCP Server bewerken" : "MCP Server toevoegen"}
            </h3>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Naam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
              placeholder="bijv. Jira, Wikiwijs, Filesystem"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Transport Type</label>
            <select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
            >
              <option value="sse">SSE (Remote URL)</option>
              <option value="stdio">Stdio (Local command)</option>
            </select>
          </div>

          {transportType === "sse" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
                  placeholder="https://example.com/sse"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Headers (JSON, optioneel)</label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  rows={3}
                  className="w-full rounded border px-3 py-2 font-mono text-sm dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </div>
            </>
          )}

          {transportType === "stdio" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Command</label>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
                  placeholder="npx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Args (spatie-gescheiden)</label>
                <input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  className="w-full rounded border px-3 py-2 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
                  placeholder="-y @modelcontextprotocol/server-filesystem /path"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Env (JSON, optioneel)</label>
                <textarea
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  rows={3}
                  className="w-full rounded border px-3 py-2 font-mono text-sm dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
                  placeholder='{"API_KEY": "..."}'
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500 disabled:opacity-50"
            >
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {servers.map((server) => (
          <div
            key={server.id}
            className="flex items-center justify-between rounded border bg-white p-4 shadow-sm dark:bg-brand-600"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Server className={`h-4 w-4 ${server.enabled ? "text-green-500" : "text-gray-400"}`} />
                <span className="font-semibold text-gray-900 dark:text-slate-100">{server.name}</span>
                {!server.enabled && (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-slate-400">
                    Uitgeschakeld
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {server.transportType === "sse" ? (
                  <span>SSE &middot; {server.url}</span>
                ) : (
                  <span>Stdio &middot; {server.command} {server.args ? JSON.parse(server.args).join(" ") : ""}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(server)}
                className={`rounded p-2 ${server.enabled ? "text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-500"}`}
                title={server.enabled ? "Uitschakelen" : "Inschakelen"}
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleEdit(server)}
                className="text-blue-500 hover:text-blue-700"
                title="Bewerken"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(server.id)}
                className="text-red-500 hover:text-red-700"
                title="Verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {servers.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Nog geen MCP servers geconfigureerd. Voeg er een toe om de AI agent uit te breiden met externe tools.
          </p>
        )}
      </div>
    </div>
  );
}
