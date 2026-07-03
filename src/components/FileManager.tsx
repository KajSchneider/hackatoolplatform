"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { File as FileIcon, Trash2, Download, Upload } from "lucide-react";

type FileItem = { id: string; name: string; size: number; mimeType: string; createdAt: string };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileManager({ teamSlug, files }: { teamSlug: string; files: FileItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/teams/${teamSlug}/files`, { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload mislukt");
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function onDelete(id: string) {
    await fetch(`/api/teams/${teamSlug}/files/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <label className="card flex cursor-pointer items-center justify-center gap-3 border-dashed py-8 transition hover:border-brand-500">
        <Upload className="h-5 w-5 text-accent-500" />
        <span className="text-sm text-slate-300">
          {uploading ? "Uploaden..." : "Klik om een bestand te uploaden"}
        </span>
        <input ref={inputRef} type="file" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {files.length === 0 && <p className="text-sm text-slate-500">Nog geen bestanden.</p>}
        {files.map((f) => (
          <div key={f.id} className="card flex items-center justify-between py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileIcon className="h-5 w-5 shrink-0 text-accent-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("nl-NL")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={`/api/teams/${teamSlug}/files/${f.id}`}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                title="Downloaden"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => onDelete(f.id)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950 hover:text-red-400"
                title="Verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
