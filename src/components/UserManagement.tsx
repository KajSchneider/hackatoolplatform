"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Shield, User } from "lucide-react";

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface Membership {
  team: { id: string; name: string; slug: string };
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  memberships: Membership[];
}

interface UserManagementProps {
  users: User[];
  teams: Team[];
}

export default function UserManagement({ users, teams }: UserManagementProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [teamId, setTeamId] = useState("");

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, teamId }),
    });
    if (res.ok) {
      setShowAddForm(false);
      setEmail("");
      setName("");
      setPassword("");
      setTeamId("");
      router.refresh();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Weet je zeker dat je deze user wilt verwijderen?")) return;
    // Delete API would need to be created
    alert("Delete functionaliteit nog niet geïmplementeerd");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gebruikers ({users.length})</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
        >
          <Plus className="h-4 w-4" />
          Gebruiker toevoegen
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Nieuwe gebruiker</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Team (optioneel)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="">Geen team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
              >
                Toevoegen
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Gebruiker</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Teams</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Aangemaakt</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Acties</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{user.name || user.email}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
                    {user.role === "admin" ? (
                      <>
                        <Shield className="h-3 w-3" />
                        Admin
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        User
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.memberships.map((m) => (
                      <span
                        key={`${m.team.id}-${m.role}`}
                        className="rounded bg-gray-100 px-2 py-1 text-xs"
                      >
                        {m.team.name} ({m.role})
                      </span>
                    ))}
                    {user.memberships.length === 0 && (
                      <span className="text-sm text-gray-400">Geen teams</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("nl-NL")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
