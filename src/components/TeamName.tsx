"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

interface TeamNameProps {
  teamId: string;
  teamSlug: string;
  name: string;
  credits: number;
  startDate?: string | null;
  endDate?: string | null;
}

export default function TeamName({ teamId, teamSlug, name, credits, startDate, endDate }: TeamNameProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editStart, setEditStart] = useState(startDate ? startDate.split('T')[0] : '');
  const [editEnd, setEditEnd] = useState(endDate ? endDate.split('T')[0] : '');

  const handleSave = async () => {
    if (!editName.trim()) return;
    const res = await fetch("/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        teamId, 
        name: editName,
        startDate: editStart || null,
        endDate: editEnd || null,
      }),
    });
    if (res.ok) {
      setIsEditing(false);
      router.refresh();
    }
  };

  const handleCancel = () => {
    setEditName(name);
    setEditStart(startDate ? startDate.split('T')[0] : '');
    setEditEnd(endDate ? endDate.split('T')[0] : '');
    setIsEditing(false);
  };

  const isActive = () => {
    if (!startDate && !endDate) return true;
    const now = new Date();
    if (startDate && now < new Date(startDate)) return false;
    if (endDate && now > new Date(endDate)) return false;
    return true;
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-brand-600">
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="flex-1 rounded border px-2 py-1 text-sm font-semibold"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Start datum</label>
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Eind datum</label>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Opslaan"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Annuleren"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <p className="truncate font-semibold text-gray-900 dark:text-slate-200">{name}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              title="Team naam bewerken"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
          {(startDate || endDate) && (
            <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              {startDate && <span>Start: {new Date(startDate).toLocaleDateString('nl-NL')}</span>}
              {startDate && endDate && <span> · </span>}
              {endDate && <span>Eind: {new Date(endDate).toLocaleDateString('nl-NL')}</span>}
              <span className="ml-2">
                {isActive() ? (
                  <span className="text-green-600">● Actief</span>
                ) : (
                  <span className="text-red-600">● Inactief</span>
                )}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-slate-500">{credits} credits</p>
        </div>
      )}
    </div>
  );
}
