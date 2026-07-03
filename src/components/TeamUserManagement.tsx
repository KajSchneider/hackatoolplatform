"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Crown, Shield, User, Mail } from "lucide-react";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

interface TeamUserManagementProps {
  teamId: string;
  teamSlug: string;
  members: Member[];
}

export default function TeamUserManagement({ teamId, teamSlug, members }: TeamUserManagementProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [role, setRole] = useState("member");

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/teams/${teamSlug}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role }),
    });
    if (res.ok) {
      setShowAddForm(false);
      setEmail("");
      setName("");
      setPassword("");
      setRole("member");
      router.refresh();
    } else {
      const error = await res.json();
      alert(error.error || "Fout bij toevoegen gebruiker");
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/teams/${teamSlug}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteRole("member");
      alert(`Uitnodiging verstuurd! Token: ${data.token}`);
    } else {
      const error = await res.json();
      alert(error.error || "Fout bij versturen uitnodiging");
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm("Weet je zeker dat je dit lid wilt verwijderen?")) return;
    // Delete membership API would need to be created
    alert("Remove functionaliteit nog niet geïmplementeerd");
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    // Update role API would need to be created
    alert("Role update functionaliteit nog niet geïmplementeerd");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Teamleden ({members.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            <Mail className="h-4 w-4" />
            Uitnodigen
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            <Plus className="h-4 w-4" />
            Lid toevoegen
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Nieuw teamlid</h3>
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
              <label className="block text-sm font-medium text-gray-700">Rol in team</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
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
              <th className="px-4 py-3 text-left text-sm font-semibold">Team Rol</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Platform Rol</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Aangemaakt</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Acties</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{member.user.name || member.user.email}</div>
                    <div className="text-sm text-gray-500">{member.user.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
                    {member.user.role === "admin" ? (
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
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(member.createdAt).toLocaleDateString("nl-NL")}
                </td>
                <td className="px-4 py-3 text-right">
                  {member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInviteForm && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Uitnodiging versturen</h3>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol in team</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              >
                Versturen
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
