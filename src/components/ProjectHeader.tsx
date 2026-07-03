"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import GitHubSettings from "./GitHubSettings";
import { Share2, Lock, Rocket, ExternalLink, MoreVertical, Pencil, Trash2, History, ArrowLeft } from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shared?: boolean;
}

interface ProjectHeaderProps {
  project: Project;
  teamSlug: string;
  groupSlug: string;
  connections: any[];
}

export default function ProjectHeader({ project, teamSlug, groupSlug, connections }: ProjectHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [shared, setShared] = useState(project.shared || false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSave = async () => {
    const res = await fetch(`/api/teams/${teamSlug}/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, shared }),
    });
    if (res.ok) {
      setIsEditing(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Weet je zeker dat je dit project wilt verwijderen?")) return;
    const res = await fetch(`/api/teams/${teamSlug}/projects/${project.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push(`/t/${teamSlug}/groups/${groupSlug}/projects`);
    }
  };

  const handleToggleShare = async () => {
    const newShared = !shared;
    setShared(newShared);
    const res = await fetch(`/api/teams/${teamSlug}/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: project.name, description: project.description, shared: newShared }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setShared(shared); // Revert on error
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/groups/${groupSlug}/projects/${project.id}/deploy`, {
        method: "POST",
      });
      if (res.ok) {
        const deployment = await res.json();
        if (deployment.url) {
          setDeploymentUrl(deployment.url);
        }
        alert(deployment.message || `Deployment successful! ${deployment.commitUrl ? `\nCommit: ${deployment.commitUrl}` : ""}`);
      } else {
        const error = await res.json();
        alert(`Deploy mislukt: ${error.error}`);
      }
    } catch (error) {
      alert("Deploy mislukt");
    } finally {
      setIsDeploying(false);
    }
  };

  if (isEditing) {
    return (
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-brand-600 dark:bg-brand-600">
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-lg font-semibold text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
            placeholder="Project naam"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
            placeholder="Beschrijving (optioneel)"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
                className="rounded"
              />
              Delen met team
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-accent-500"
              >
                Opslaan
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(project.name);
                  setDescription(project.description || "");
                  setShared(project.shared || false);
                }}
                className="rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-brand-600 dark:bg-brand-600">
      <div className="flex items-center justify-between">
        {/* Left: back + project name */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={`/t/${teamSlug}/groups/${groupSlug}/projects`}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            title="Terug naar projects"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">{project.name}</h1>
              {shared && <Share2 className="h-4 w-4 shrink-0 text-blue-500" />}
            </div>
            {project.description && (
              <p className="truncate text-sm text-gray-600 dark:text-slate-400">{project.description}</p>
            )}
          </div>
        </div>

        {/* Right: primary actions */}
        <div className="flex items-center gap-2 shrink-0">
          {deploymentUrl && (
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-accent-500 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              title="Bekijk live site"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
            title="Push naar GitHub + GitHub Pages"
          >
            <Rocket className="h-4 w-4" />
            {isDeploying ? "Pushen..." : "Deploy"}
          </button>

          <GitHubSettings
            projectId={project.id}
            teamSlug={teamSlug}
            groupSlug={groupSlug}
            connections={connections}
          />

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-brand-500"
              title="Meer opties"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-brand-500 dark:bg-brand-600">
                <button
                  onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
                >
                  <Pencil className="h-4 w-4" />
                  Bewerken
                </button>
                <button
                  onClick={() => { handleToggleShare(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
                >
                  {shared ? <Lock className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {shared ? "Delen uit" : "Delen met team"}
                </button>
                <a
                  href={`/t/${teamSlug}/groups/${groupSlug}/projects/${project.id}/deployments`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
                >
                  <History className="h-4 w-4" />
                  Deployments
                </a>
                <div className="my-1 border-t border-gray-200 dark:border-brand-500" />
                <button
                  onClick={() => { handleDelete(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Verwijderen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
