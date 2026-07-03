"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, X, Check, Plus, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  memberships: Array<{
    team: { id: string; name: string; slug: string };
    role: string;
  }>;
  groupMemberships: Array<{
    group: {
      id: string;
      name: string;
      slug: string;
      team: { id: string; name: string; slug: string };
    };
    role: string;
  }>;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  credits: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  memberships: Array<{
    user: { id: string; email: string; name: string | null };
    role: string;
  }>;
  groups: Array<{
    id: string;
    name: string;
    slug: string;
    memberships: Array<{
      user: { id: string; email: string; name: string | null };
      role: string;
    }>;
    projects: Array<{ id: string; name: string; slug: string }>;
  }>;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "teams">("teams");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New hackathon form state
  const [hackathonName, setHackathonName] = useState("");
  const [beheerderId, setBeheerderId] = useState("");
  const [hackathonStart, setHackathonStart] = useState("");
  const [hackathonEnd, setHackathonEnd] = useState("");
  const [hackathonError, setHackathonError] = useState("");
  const [hackathonLoading, setHackathonLoading] = useState(false);

  // Edit hackathon state
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editError, setEditError] = useState("");

  // Delete confirmation
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/teams"),
      ]);
      if (usersRes.ok && teamsRes.ok) {
        setUsers(await usersRes.json());
        setTeams(await teamsRes.json());
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAdmin = async () => {
    try {
      const res = await fetch("/api/admin/set-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success: ${email} is now admin`);
        setEmail("");
        loadData();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("Error: Failed to set admin");
    }
  };

  const handleAddToHackathon = async (userId: string, teamId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/hackathons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Failed to add to hackathon:", error);
    }
  };

  const handleRemoveFromHackathon = async (userId: string, teamId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/hackathons?teamId=${teamId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Failed to remove from hackathon:", error);
    }
  };

  const handleAddToGroup = async (userId: string, groupId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Failed to add to group:", error);
    }
  };

  const handleRemoveFromGroup = async (userId: string, groupId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/groups?groupId=${groupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Failed to remove from group:", error);
    }
  };

  const handleCreateHackathon = async () => {
    setHackathonError("");
    if (!hackathonName || !beheerderId) {
      setHackathonError("Naam en beheerder zijn verplicht");
      return;
    }
    setHackathonLoading(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hackathonName,
          beheerderId,
          startDate: hackathonStart || undefined,
          endDate: hackathonEnd || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setHackathonName("");
        setBeheerderId("");
        setHackathonStart("");
        setHackathonEnd("");
        loadData();
      } else {
        setHackathonError(data.error || "Aanmaken mislukt");
      }
    } catch {
      setHackathonError("Aanmaken mislukt");
    } finally {
      setHackathonLoading(false);
    }
  };

  const startEdit = (team: Team) => {
    setEditingTeam(team.id);
    setEditName(team.name);
    setEditStart(team.startDate ? team.startDate.split("T")[0] : "");
    setEditEnd(team.endDate ? team.endDate.split("T")[0] : "");
    setEditError("");
  };

  const handleSaveEdit = async (teamId: string) => {
    setEditError("");
    if (!editName) {
      setEditError("Naam is verplicht");
      return;
    }
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          startDate: editStart || undefined,
          endDate: editEnd || undefined,
        }),
      });
      if (res.ok) {
        setEditingTeam(null);
        loadData();
      } else {
        const data = await res.json();
        setEditError(data.error || "Opslaan mislukt");
      }
    } catch {
      setEditError("Opslaan mislukt");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
      if (res.ok) {
        setDeletingTeam(null);
        loadData();
      }
    } catch {
      console.error("Failed to delete team:");
    }
  };

  if (loading) return <div className="p-8 text-slate-100">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-brand-700">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Panel</h1>

        {/* Create Hackathon */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow dark:bg-brand-600">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Nieuwe Hackathon Aanmaken</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Naam *</label>
              <input
                type="text"
                value={hackathonName}
                onChange={(e) => setHackathonName(e.target.value)}
                placeholder="Hackathon naam"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Beheerder *</label>
              <select
                value={beheerderId}
                onChange={(e) => setBeheerderId(e.target.value)}
                className="input"
              >
                <option value="">Selecteer beheerder...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Startdatum</label>
              <input
                type="date"
                value={hackathonStart}
                onChange={(e) => setHackathonStart(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Einddatum</label>
              <input
                type="date"
                value={hackathonEnd}
                onChange={(e) => setHackathonEnd(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <button
            onClick={handleCreateHackathon}
            disabled={hackathonLoading}
            className="btn-primary mt-4"
          >
            <Plus className="mr-1 inline h-4 w-4" />
            {hackathonLoading ? "Bezig..." : "Hackathon Aanmaken"}
          </button>
          {hackathonError && (
            <p className="mt-2 text-sm text-red-500">{hackathonError}</p>
          )}
        </div>

        {/* Set Admin */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow dark:bg-brand-600">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Gebruiker Admin Rechten Geven</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="input flex-1"
            />
            <button
              onClick={handleSetAdmin}
              className="btn-primary"
            >
              <Shield className="mr-1 inline h-4 w-4" />
              Maak Admin
            </button>
          </div>
          {message && (
            <p className={`mt-4 text-sm ${message.startsWith("Success") ? "text-green-500" : "text-red-500"}`}>
              {message}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab("teams")}
            className={`rounded px-4 py-2 text-sm font-medium ${activeTab === "teams" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-brand-500 dark:text-slate-300"}`}
          >
            Hackathons ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded px-4 py-2 text-sm font-medium ${activeTab === "users" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-brand-500 dark:text-slate-300"}`}
          >
            Users ({users.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-brand-600">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 dark:bg-brand-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Naam</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Hackathons</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Groups</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Acties</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-slate-300">Aangemaakt</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b dark:border-brand-600">
                    <td className="px-4 py-3 text-gray-900 dark:text-slate-100">{user.email}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{user.name || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs ${user.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-gray-100 text-gray-700 dark:bg-brand-500 dark:text-slate-400"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.memberships.map((m) => (
                          <span key={m.team.id} className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {m.team.name}
                            <button
                              onClick={() => handleRemoveFromHackathon(user.id, m.team.id)}
                              className="text-blue-900 hover:text-red-500 dark:text-blue-100"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.groupMemberships.map((m) => (
                          <span key={m.group.id} className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            {m.group.name}
                            <button
                              onClick={() => handleRemoveFromGroup(user.id, m.group.id)}
                              className="text-green-900 hover:text-red-500 dark:text-green-100"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-brand-500 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Beheer
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === "teams" && (
          <div className="space-y-4">
            {teams.map((team) => (
              <div key={team.id} className="rounded-lg bg-white p-6 shadow dark:bg-brand-600">
                {/* Header with edit/delete buttons */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex-1">
                    {editingTeam === team.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input"
                          placeholder="Hackathon naam"
                        />
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                            className="input"
                          />
                          <input
                            type="date"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                            className="input"
                          />
                        </div>
                        {editError && <p className="text-sm text-red-500">{editError}</p>}
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{team.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-500">
                          /{team.slug}
                          {team.startDate && ` · ${new Date(team.startDate).toLocaleDateString()}`}
                          {team.endDate && ` → ${new Date(team.endDate).toLocaleDateString()}`}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingTeam === team.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(team.id)}
                          className="rounded bg-green-500 p-2 text-white hover:bg-green-600"
                          title="Opslaan"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingTeam(null)}
                          className="rounded bg-gray-300 p-2 text-gray-700 hover:bg-gray-400 dark:bg-slate-700 dark:text-slate-300"
                          title="Annuleren"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(team)}
                          className="rounded bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-brand-500 dark:text-slate-400 dark:hover:bg-slate-700"
                          title="Bewerken"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {deletingTeam === team.id ? (
                          <>
                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                              Bevestig
                            </button>
                            <button
                              onClick={() => setDeletingTeam(null)}
                              className="rounded bg-gray-300 px-2 py-1 text-xs dark:bg-slate-700 dark:text-slate-300"
                            >
                              Annuleer
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeletingTeam(team.id)}
                            className="rounded bg-gray-100 p-2 text-red-500 hover:bg-red-100 dark:bg-brand-500 dark:hover:bg-red-900/40"
                            title="Verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-4 text-sm text-gray-500 dark:text-slate-500">
                  {team.memberships.length} leden · {team.groups.length} groepen
                </div>

                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">Leden</h4>
                  <div className="flex flex-wrap gap-2">
                    {team.memberships.map((m) => (
                      <span key={m.user.id} className="flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-brand-500 dark:text-slate-300">
                        {m.user.name || m.user.email} ({m.role})
                        <button
                          onClick={() => handleRemoveFromHackathon(m.user.id, team.id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {team.memberships.length === 0 && <span className="text-sm text-gray-400 dark:text-slate-600">Geen leden</span>}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">Groepen</h4>
                  <div className="space-y-2">
                    {team.groups.map((group) => (
                      <div key={group.id} className="rounded border border-gray-200 p-3 dark:border-brand-600">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-slate-100">{group.name}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-500">
                            {group.memberships.length} leden · {group.projects.length} projecten
                          </span>
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1">
                          {group.memberships.map((m) => (
                            <span key={m.user.id} className="flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              {m.user.name || m.user.email}
                              <button
                                onClick={() => handleRemoveFromGroup(m.user.id, group.id)}
                                className="text-green-900 hover:text-red-500 dark:text-green-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.projects.map((p) => (
                            <span key={p.id} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {team.groups.length === 0 && <span className="text-sm text-gray-400 dark:text-slate-600">Nog geen groepen</span>}
                  </div>
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-brand-600">
                <p className="text-sm text-gray-500 dark:text-slate-400">Nog geen hackathons. Maak er hierboven één aan.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-brand-600">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Beheer {selectedUser.email}</h2>
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">Toevoegen aan Hackathon</h3>
              <select
                className="input"
                onChange={(e) => handleAddToHackathon(selectedUser.id, e.target.value)}
                defaultValue=""
              >
                <option value="">Selecteer hackathon...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">Toevoegen aan Groep</h3>
              <select
                className="input"
                onChange={(e) => handleAddToGroup(selectedUser.id, e.target.value)}
                defaultValue=""
              >
                <option value="">Selecteer groep...</option>
                {teams.flatMap((team) =>
                  team.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {team.name} / {group.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="btn-secondary w-full"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
