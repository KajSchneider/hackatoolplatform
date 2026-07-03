"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Folder, FolderOpen, File, Plus, Trash2, Edit, X, Eye, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import FolderEditModal from "@/components/FolderEditModal";

function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeBlockMatch = line.match(/^```(\w*)$/);

    if (codeBlockMatch) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre key={`code-${i}`} className="mt-2 rounded bg-gray-900 p-3 text-xs text-gray-100 overflow-x-auto dark:bg-black dark:text-gray-100">
            <code>{codeContent.join("\n")}</code>
          </pre>
        );
        codeContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        codeLanguage = codeBlockMatch[1] || "";
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      codeContent.push(line);
    } else {
      // Regular text with inline code
      const parts = line.split(/(`[^`]+`)/g);
      const lineElements = parts.map((part, idx) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={idx} className="rounded bg-gray-200 px-1 py-0.5 text-xs font-mono text-gray-800 dark:bg-slate-700 dark:text-slate-200">{part.slice(1, -1)}</code>;
        }
        return <span key={idx}>{part}</span>;
      });
      elements.push(
        <p key={`text-${i}`} className="mb-2 text-sm text-gray-700 dark:text-slate-300">
          {lineElements}
        </p>
      );
    }
  }

  return <div>{elements}</div>;
}

interface File {
  id: string;
  path: string;
  content: string;
  folderId?: string | null;
}

interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  children: Folder[];
  files: File[];
}

interface ModelItem {
  id: string;
  label: string;
}

interface Tab {
  id: string;
  type: "file" | "preview";
  path: string;
}

interface IDEProps {
  projectId: string;
  teamSlug: string;
  groupSlug?: string;
  customModels?: ModelItem[];
}

export default function IDE({ projectId, teamSlug, groupSlug, customModels = [] }: IDEProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [agentMessages, setAgentMessages] = useState<{ role: string; content: string }[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [isAgentStreaming, setIsAgentStreaming] = useState(false);
  const [model, setModel] = useState(customModels[0]?.id ?? "");
  const [fileTreeCollapsed, setFileTreeCollapsed] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;
  const activeFile = activeTab?.type === "file" ? files.find((f) => f.id === activeTab.id) || null : null;

  const basePath = `/api/teams/${teamSlug}/projects/${projectId}`;
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFiles();
    loadFolders();
    loadAgentMessages();
  }, [projectId, teamSlug, groupSlug, basePath]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  const loadFiles = async () => {
    try {
      const res = await fetch(`${basePath}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const res = await fetch(`${basePath}/folders`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };

  const loadAgentMessages = async () => {
    try {
      const res = await fetch(`${basePath}/agent-messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setAgentMessages(data);
      }
    } catch (error) {
      console.error("Failed to load agent messages:", error);
    }
  };

  const saveAgentMessage = async (role: string, content: string) => {
    try {
      await fetch(`${basePath}/agent-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error("Failed to save agent message:", error);
    }
  };

  const handleSaveFile = async (content: string | undefined) => {
    if (!activeFile || content === undefined) return;

    try {
      const res = await fetch(`${basePath}/files`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: activeFile.path, content }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setFiles((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f))
        );
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const handleCreateFile = async (folderId?: string) => {
    const path = prompt("Voer bestandspad in (bijv. src/index.js):");
    if (!path) return;

    try {
      const res = await fetch(`${basePath}/files`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content: "", folderId }),
        }
      );
      if (res.ok) {
        const newFile = await res.json();
        setFiles((prev) => [...prev, newFile]);
        openFile(newFile);
      }
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  };

  const handleCreateFolder = async (parentId?: string) => {
    const name = prompt("Voer mapnaam in:");
    if (!name) return;

    try {
      const res = await fetch(`${basePath}/folders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, parentId }),
        }
      );
      if (res.ok) {
        const newFolder = await res.json();
        setFolders((prev) => [...prev, newFolder]);
        if (parentId) {
          setExpandedFolders((prev) => new Set([...prev, parentId]));
        }
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Deze map en alle inhoud verwijderen?")) return;

    try {
      const res = await fetch(
        `${basePath}/folders/${folderId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        setFiles((prev) => prev.filter((f) => f.folderId !== folderId));
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setIsEditModalOpen(true);
  };

  const handleSaveFolderName = async (name: string) => {
    if (!editingFolder) return;

    try {
      const res = await fetch(
        `${basePath}/folders/${editingFolder.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      }
    } catch (error) {
      console.error("Failed to update folder:", error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Dit bestand verwijderen?")) return;

    try {
      const res = await fetch(
        `${basePath}/files/${fileId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        closeTab(fileId);
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const openFile = (file: File) => {
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === file.id)) return prev;
      return [...prev, { id: file.id, type: "file" as const, path: file.path }];
    });
    setActiveTabId(file.id);
  };

  const openPreview = () => {
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === "preview")) return prev;
      return [...prev, { id: "preview", type: "preview" as const, path: "Preview" }];
    });
    setActiveTabId("preview");
  };

  const closeTab = (tabId: string) => {
    setOpenTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolderTree = (parentId: string | null = null, level: number = 0) => {
    const childFolders = folders.filter((f) => f.parentId === parentId);
    const rootFiles = files.filter((f) => !f.folderId && parentId === null);

    return (
      <>
        {childFolders.map((folder) => (
          <div key={folder.id} style={{ marginLeft: `${level * 12}px` }}>
            <div
              className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-brand-500 ${
                expandedFolders.has(folder.id) ? "bg-gray-50 dark:bg-brand-500/50" : ""
              }`}
              onClick={() => toggleFolder(folder.id)}
            >
              <div className="flex items-center gap-1">
                {expandedFolders.has(folder.id) ? (
                  <FolderOpen className="h-4 w-4 text-accent-500" />
                ) : (
                  <Folder className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                )}
                <span className="truncate text-gray-800 dark:text-slate-200">{folder.name}</span>
              </div>
              {expandedFolders.has(folder.id) && (
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFolder(folder);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    title="Mapnaam bewerken"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFile(folder.id);
                    }}
                    className="text-accent-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Nieuw bestand in map"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFolder(folder.id);
                    }}
                    className="text-accent-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Nieuwe submap"
                  >
                    <Folder className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Map verwijderen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            {expandedFolders.has(folder.id) && renderFolderTree(folder.id, level + 1)}
            {expandedFolders.has(folder.id) && (
              <div>
                {files
                  .filter((f) => f.folderId === folder.id)
                  .map((file) => (
                    <div
                      key={file.id}
                      style={{ marginLeft: `${(level + 1) * 12}px` }}
                      className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-brand-500 ${
                        activeTabId === file.id ? "bg-blue-100 text-blue-700 dark:bg-accent-500/20 dark:text-accent-300" : "text-gray-800 dark:text-slate-200"
                      }`}
                      onClick={() => openFile(file)}
                    >
                      <div className="flex items-center gap-1">
                        <File className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
        {rootFiles.map((file) => (
          <div
            key={file.id}
            style={{ marginLeft: `${level * 12}px` }}
            className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-brand-500 ${
              activeTabId === file.id ? "bg-blue-100 text-blue-700 dark:bg-accent-500/20 dark:text-accent-300" : "text-gray-800 dark:text-slate-200"
            }`}
            onClick={() => openFile(file)}
          >
            <div className="flex items-center gap-1">
              <File className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              <span className="truncate">{file.path}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file.id);
              }}
              className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </>
    );
  };

  const handleAgentMessage = async () => {
    if (!agentInput.trim() || isAgentStreaming) return;
    if (!model) {
      setAgentMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Geen model beschikbaar. Configureer eerst een AI Endpoint." },
      ]);
      return;
    }

    const userMessage = agentInput;
    setAgentInput("");
    setAgentMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    saveAgentMessage("user", userMessage);
    setIsAgentStreaming(true);

    try {
      const res = await fetch(
        `${basePath}/agent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            model,
            history: agentMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAgentMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error || "agent reageert niet."}` },
        ]);
        setIsAgentStreaming(false);
        return;
      }

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        setAgentMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          setAgentMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }

        // Parse FILE: blocks and create/update files
        // Format: FILE: path \n ```lang code ```
        const fileRegex = /FILE:\s*([^\s\n]+)\s*\n```(\w*)\s*([\s\S]*?)\s*```/g;
        const fileMatches = [...assistantContent.matchAll(fileRegex)];
        
        for (const match of fileMatches) {
          const filePath = match[1];
          const fileContent = match[3];
          
          try {
            await fetch(`${basePath}/files`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: filePath, content: fileContent }),
            });
          } catch (error) {
            console.error("Failed to save file:", filePath, error);
          }
        }

        // Parse RUN_PYTHON: blocks and execute them
        // Format: RUN_PYTHON:\n```python\ncode\n```
        const pythonRegex = /RUN_PYTHON:\s*\n```(?:python)?\s*([\s\S]*?)\s*```/g;
        const pythonMatches = [...assistantContent.matchAll(pythonRegex)];
        
        for (const match of pythonMatches) {
          const script = match[1];
          try {
            const pyRes = await fetch(`${basePath}/run-python`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ script }),
            });
            const pyResult = await pyRes.json();
            const output = pyResult.stdout
              ? `Python output:\n${pyResult.stdout}`
              : "";
            const errors = pyResult.stderr
              ? `${output ? "\n" : ""}Python stderr:\n${pyResult.stderr}`
              : "";
            const resultMsg = `${output}${errors}`.trim() || "Python script voltooid (geen output)";
            
            setAgentMessages((prev) => [...prev, { role: "assistant", content: resultMsg }]);
          } catch (error) {
            console.error("Failed to run Python:", error);
            setAgentMessages((prev) => [...prev, { role: "assistant", content: "Fout bij uitvoeren Python script." }]);
          }
        }

        // Parse GENERATE_DOC: blocks and generate documents
        // Format: GENERATE_DOC: filename | pdf|docx | Title\n```json\n{...}\n```
        const docRegex = /GENERATE_DOC:\s*([^|]+)\|\s*(pdf|docx)\s*\|\s*([^\n]+)\n```(?:json)?\s*([\s\S]*?)\s*```/g;
        const docMatches = [...assistantContent.matchAll(docRegex)];
        
        for (const match of docMatches) {
          const fileName = match[1].trim();
          const format = match[2].trim();
          const docTitle = match[3].trim();
          const jsonContent = match[4];
          
          try {
            const parsed = JSON.parse(jsonContent);
            const sections = Array.isArray(parsed) ? parsed : parsed.sections;
            const docRes = await fetch(`${basePath}/generate-doc`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ format, title: docTitle, sections, fileName }),
            });
            
            if (docRes.ok) {
              const blob = await docRes.blob();
              const url = window.URL.createObjectURL(blob);
              const a = window.document.createElement("a");
              a.href = url;
              a.download = `${fileName}.${format}`;
              window.document.body.appendChild(a);
              a.click();
              window.document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              
              setAgentMessages((prev) => [...prev, { role: "assistant", content: `Document "${fileName}.${format}" is gegenereerd en gedownload.` }]);
            } else {
              const errData = await docRes.json().catch(() => ({}));
              setAgentMessages((prev) => [...prev, { role: "assistant", content: `Fout bij genereren document: ${errData.error || "onbekend"}` }]);
            }
          } catch (error) {
            console.error("Failed to generate doc:", error);
            setAgentMessages((prev) => [...prev, { role: "assistant", content: "Fout bij genereren document. Controleer de JSON syntax." }]);
          }
        }

        // Reload files if any were created/updated
        if (fileMatches.length > 0) {
          loadFiles();
        }

        // Save assistant response to database
        if (assistantContent) {
          saveAgentMessage("assistant", assistantContent);
        } else {
          setAgentMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: "De agent gaf geen reactie. Controleer of het AI endpoint correct is geconfigureerd.",
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Agent error:", error);
      setAgentMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Fout: Geen reactie van de agent." },
      ]);
    } finally {
      setIsAgentStreaming(false);
    }
  };

  if (isLoading) return <div className="p-4 text-gray-700 dark:text-slate-300">IDE laden...</div>;

  return (
    <div className="flex h-screen bg-white dark:bg-brand-700">
      {/* File Tree */}
      {fileTreeCollapsed ? (
        <div className="flex w-10 flex-col items-center border-r border-gray-200 bg-gray-50 py-2 dark:border-brand-600 dark:bg-brand-600">
          <button
            onClick={() => setFileTreeCollapsed(false)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-brand-500"
            title="Bestanden tonen"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            onClick={openPreview}
            className="mt-2 rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-brand-500"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 dark:border-brand-600 dark:bg-brand-600">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Bestanden</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setFileTreeCollapsed(true)}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-brand-500"
                title="Bestanden verbergen"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <button
                onClick={openPreview}
                className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
                title="Open preview"
              >
                <Eye className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleCreateFile()}
                className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleCreateFolder()}
                className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
              >
                <Folder className="h-3 w-3" />
              </button>
            </div>
          </div>
        <div className="space-y-1">
          {renderFolderTree()}
          {files.length === 0 && folders.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-slate-500">Nog geen bestanden of mappen</p>
          )}
        </div>
      </div>
      )}

      {/* Editor + Agent Panel */}
      <div className="flex flex-1">
        <div className="flex flex-1 flex-col">
          {/* Tab Bar */}
          {openTabs.length > 0 && (
            <div className="flex border-b border-gray-200 bg-gray-100 dark:border-brand-600 dark:bg-brand-600">
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex cursor-pointer items-center gap-1.5 border-r border-gray-200 px-3 py-2 text-xs dark:border-brand-600 ${
                    activeTabId === tab.id
                      ? "bg-white text-gray-900 dark:bg-brand-500 dark:text-slate-100"
                      : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-brand-500/50"
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.type === "preview" ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <File className="h-3 w-3" />
                  )}
                  <span className="max-w-[120px] truncate">{tab.path}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="ml-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab?.type === "preview" ? (
              <iframe
                src={`${basePath}/preview`}
                className="h-full w-full border-0"
                title="Preview"
              />
            ) : activeFile ? (
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={activeFile.content}
                onChange={handleSaveFile}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 dark:text-slate-500">
                Selecteer een bestand om te bewerken
              </div>
            )}
          </div>
        </div>

        {/* AI Agent Panel */}
        {agentCollapsed ? (
          <div className="flex w-10 flex-col items-center border-l border-gray-200 bg-gray-50 py-2 dark:border-brand-600 dark:bg-brand-600">
            <button
              onClick={() => setAgentCollapsed(false)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-brand-500"
              title="Agent tonen"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
            <span
              className="mt-4 text-xs font-medium text-gray-500 dark:text-slate-400"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              AI Agent
            </span>
          </div>
        ) : (
        <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col dark:border-brand-600 dark:bg-brand-600">
          <div className="border-b border-gray-200 bg-white p-3 shrink-0 dark:border-brand-600 dark:bg-brand-600">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">AI Agent</h3>
                <p className="text-xs text-gray-500 dark:text-slate-500">Code, Python scripts & documenten</p>
              </div>
              <button
                onClick={() => setAgentCollapsed(true)}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-brand-500"
                title="Agent verbergen"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={customModels.length === 0}
              className="mt-2 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
            >
              {customModels.length === 0 ? (
                <option value="">Geen modellen — configureer een AI Endpoint</option>
              ) : (
                customModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {agentMessages.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-500">
                Start een gesprek met de AI agent. De agent kan code schrijven, Python scripts uitvoeren en PDF/DOCX documenten genereren.
              </p>
            )}
            {agentMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 text-sm ${
                  msg.role === "user"
                    ? "bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-100"
                    : "bg-white border border-gray-200 dark:bg-brand-500 dark:border-brand-500"
                }`}
              >
                <div className="mb-1 font-semibold text-xs uppercase opacity-70">
                  {msg.role}
                </div>
                {msg.role === "assistant" ? <Markdown content={msg.content} /> : <div className="whitespace-pre-wrap">{msg.content}</div>}
              </div>
            ))}
            {isAgentStreaming && (
              <div className="text-sm text-gray-500 dark:text-slate-500">Agent is aan het denken...</div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-gray-200 bg-white p-3 shrink-0 sticky bottom-0 dark:border-brand-600 dark:bg-brand-600">
            <div className="flex gap-2">
              <input
                type="text"
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAgentMessage()}
                placeholder="Vraag de agent..."
                disabled={isAgentStreaming}
                className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
              />
              <button
                onClick={handleAgentMessage}
                disabled={isAgentStreaming}
                className="rounded bg-accent-500 px-4 py-2 text-sm text-white hover:bg-accent-600 disabled:opacity-50"
              >
                Verstuur
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
      <FolderEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveFolderName}
        currentName={editingFolder?.name || ""}
      />
    </div>
  );
}
