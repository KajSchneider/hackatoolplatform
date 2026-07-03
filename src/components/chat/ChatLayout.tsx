"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { SendHorizonal, Plus, Bot, User, Trash2, Share2, Lock } from "lucide-react";
import Logo from "@/components/Logo";

type ConversationListItem = { id: string; title: string; shared: boolean; userId: string };
type BotListItem = { id: string; name: string };
type ModelListItem = { id: string; label: string; provider: string };

export default function ChatLayout({
  teamSlug,
  groupSlug,
  conversations,
  conversationId,
  initialMessages,
  initialModel,
  bots = [],
  initialChatbotId,
  customModels = [],
  currentUserId,
}: {
  teamSlug: string;
  groupSlug?: string;
  conversations: ConversationListItem[];
  conversationId?: string;
  initialMessages: Message[];
  initialModel?: string;
  bots?: BotListItem[];
  initialChatbotId?: string;
  customModels?: ModelListItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  // Only custom endpoint models are available
  const allModels = customModels;
  const validInitial = initialModel && customModels.some(m => m.id === initialModel);
  const [model, setModel] = useState(validInitial ? initialModel : customModels[0]?.id ?? "");
  const [chatbotId, setChatbotId] = useState<string | undefined>(initialChatbotId);
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    api: "/api/chat",
    initialMessages,
    body: { teamSlug, groupSlug, model, conversationId: convId, chatbotId },
    onResponse(response) {
      const id = response.headers.get("x-conversation-id");
      if (id && !convId) setConvId(id);
    },
    onFinish() {
      router.refresh();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Weet je zeker dat je dit gesprek wilt verwijderen?")) return;

    try {
      await fetch(`/api/chat?conversationId=${conversationId}&teamSlug=${teamSlug}`, {
        method: "DELETE",
      });
      if (convId === conversationId) {
        router.push(`/t/${teamSlug}/chat`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleToggleShare = async (e: React.MouseEvent, conversationId: string, currentShared: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await fetch(`/api/chat/${conversationId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared: !currentShared }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to toggle share:", error);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-brand-700">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-3 dark:border-brand-600 dark:bg-brand-600">
        <Link href={`/t/${teamSlug}/chat`} className="btn-secondary w-full">
          <Plus className="h-4 w-4" />
          Nieuw gesprek
        </Link>
        <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <div key={c.id} className="relative group">
              <Link
                href={`/t/${teamSlug}/chat/${c.id}`}
                className={`block truncate rounded-lg px-3 py-2 text-sm pr-16 ${
                  c.id === convId
                    ? "bg-gray-200 text-gray-900 dark:bg-brand-500 dark:text-slate-100"
                    : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-brand-500/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  {c.shared && <Share2 className="h-3 w-3 text-accent-400" />}
                  {c.title}
                </div>
              </Link>
              {c.userId === currentUserId && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleToggleShare(e, c.id, c.shared)}
                    className="p-1 text-gray-400 hover:text-accent-500 dark:text-slate-400 dark:hover:text-accent-400"
                    title={c.shared ? "Delen uit" : "Delen met team"}
                  >
                    {c.shared ? <Lock className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="p-1 text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
                    title="Verwijder gesprek"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-brand-600">
          <h1 className="text-sm font-medium text-gray-700 dark:text-slate-300">AI Chat</h1>
          <div className="flex items-center gap-2">
            {bots.length > 0 && (
              <select
                className="input w-auto"
                value={chatbotId ?? ""}
                onChange={(e) => setChatbotId(e.target.value || undefined)}
              >
                <option value="">Standaard assistent</option>
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <select
              className="input w-auto"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!!chatbotId || allModels.length === 0}
              title={chatbotId ? "Model wordt bepaald door de chatbot" : undefined}
            >
              {allModels.length === 0 ? (
                <option value="">Geen modellen — configureer een AI Endpoint</option>
              ) : (
                allModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-gray-500 dark:text-slate-500">
              <Bot className="h-10 w-10 text-accent-500" />
              <p className="mt-3 text-sm">Stel een vraag om te beginnen.</p>
            </div>
          )}
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3">
                <div className="mt-1 shrink-0">
                  {m.role === "user" ? (
                    <User className="h-5 w-5 text-gray-400 dark:text-slate-400" />
                  ) : (
                    <Bot className="h-5 w-5 text-accent-500" />
                  )}
                </div>
                <div className="min-w-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-slate-200">
                  {m.content}
                </div>
              </div>
            ))}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
                {error.message || "Er ging iets mis. Controleer je API keys of credits."}
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 dark:border-brand-600">
          <div className="mx-auto flex max-w-3xl gap-3">
            <input
              className="input"
              value={input}
              onChange={handleInputChange}
              placeholder="Typ je bericht..."
              disabled={isLoading}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={isLoading || !input.trim()}>
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
