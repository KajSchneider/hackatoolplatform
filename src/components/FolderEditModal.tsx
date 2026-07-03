"use client";

import { useState } from "react";

interface FolderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
}

export default function FolderEditModal({ isOpen, onClose, onSave, currentName }: FolderEditModalProps) {
  const [name, setName] = useState(currentName);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg dark:bg-brand-600 dark:border dark:border-brand-500">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Folder bewerken</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onClose();
          }}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
