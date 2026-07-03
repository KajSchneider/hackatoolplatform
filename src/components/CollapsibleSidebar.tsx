"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function CollapsibleSidebar({ children, title }: { children: React.ReactNode; title?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-gray-200 bg-gray-50 py-3 dark:border-brand-600 dark:bg-brand-600/40">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-brand-500"
          title="Menu tonen"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        {title && (
          <span
            className="mt-4 text-xs font-medium text-gray-500 dark:text-slate-400"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {title}
          </span>
        )}
      </div>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-brand-600 dark:bg-brand-600/40">
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-brand-500"
          title="Menu verbergen"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      {children}
    </aside>
  );
}
