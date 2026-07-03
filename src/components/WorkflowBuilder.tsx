"use client";

import { useState, useEffect } from "react";
import { Share2, Lock } from "lucide-react";

interface Step {
  id: string;
  order: number;
  type: string;
  config: any;
  chatbotId?: string | null;
  chatbot?: { id: string; name: string } | null;
}

interface Chatbot {
  id: string;
  name: string;
}

interface WorkflowBuilderProps {
  workflowId: string;
  teamSlug: string;
  initialSteps?: Step[];
  initialShared?: boolean;
}

export default function WorkflowBuilder({
  workflowId,
  teamSlug,
  initialSteps = [],
  initialShared = false,
}: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [newStepType, setNewStepType] = useState("prompt");
  const [newStepPrompt, setNewStepPrompt] = useState("");
  const [newStepModel, setNewStepModel] = useState("");
  const [newStepChatbotId, setNewStepChatbotId] = useState("");
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [shared, setShared] = useState(initialShared);

  useEffect(() => {
    loadSteps();
    loadChatbots();
  }, [workflowId, teamSlug]);

  const loadSteps = async () => {
    const res = await fetch(
      `/api/teams/${teamSlug}/workflows/${workflowId}/steps`
    );
    if (res.ok) {
      const data = await res.json();
      setSteps(data);
    }
  };

  const loadChatbots = async () => {
    const res = await fetch(`/api/teams/${teamSlug}/bots`);
    if (res.ok) {
      const data = await res.json();
      setChatbots(data);
    }
  };

  const addStep = async () => {
    const config =
      newStepType === "prompt"
        ? { prompt: newStepPrompt, model: newStepModel }
        : { config: "placeholder" };

    const res = await fetch(
      `/api/teams/${teamSlug}/workflows/${workflowId}/steps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newStepType,
          config,
          order: steps.length,
          chatbotId: newStepChatbotId || null,
        }),
      }
    );
    if (res.ok) {
      setNewStepPrompt("");
      setNewStepChatbotId("");
      loadSteps();
    }
  };

  const updateStep = async (step: Step) => {
    const res = await fetch(
      `/api/teams/${teamSlug}/workflows/${workflowId}/steps/${step.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: step.type,
          config: step.config,
          chatbotId: step.chatbotId || null,
        }),
      }
    );
    if (res.ok) {
      setEditingStep(null);
      loadSteps();
    }
  };

  const deleteStep = async (stepId: string) => {
    if (!confirm("Delete this step?")) return;
    const res = await fetch(
      `/api/teams/${teamSlug}/workflows/${workflowId}/steps/${stepId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
    }
  };

  const handleToggleShare = async () => {
    const newShared = !shared;
    setShared(newShared);
    const res = await fetch(
      `/api/teams/${teamSlug}/workflows/${workflowId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared: newShared }),
      }
    );
    if (!res.ok) {
      setShared(shared); // Revert on error
    }
  };

  const runWorkflow = async () => {
    const res = await fetch(
      `/api/teams/${teamSlug}/workflows/${workflowId}/run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {} }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      alert(`Run completed: ${data.status}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Steps</h2>
          <button
            onClick={handleToggleShare}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
            title={shared ? "Delen uit" : "Delen met team"}
          >
            {shared ? <Lock className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shared ? "Delen uit" : "Delen"}
          </button>
        </div>
        <button
          onClick={runWorkflow}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Run Workflow
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="rounded border bg-white p-4 shadow-sm"
          >
            {editingStep?.id === step.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Step {step.order + 1}</span>
                  <select
                    value={editingStep.type}
                    onChange={(e) => setEditingStep({ ...editingStep, type: e.target.value })}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    <option value="prompt">Prompt</option>
                    <option value="agent">Agent</option>
                    <option value="tool">Tool</option>
                  </select>
                </div>
                {editingStep.type === "prompt" && (
                  <textarea
                    value={editingStep.config.prompt || ""}
                    onChange={(e) => setEditingStep({
                      ...editingStep,
                      config: { ...editingStep.config, prompt: e.target.value }
                    })}
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                    placeholder="Enter prompt..."
                  />
                )}
                <select
                  value={editingStep.chatbotId || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, chatbotId: e.target.value || null })}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="">No Persona</option>
                  {chatbots.map((bot) => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStep(editingStep)}
                    className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-accent-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingStep(null)}
                    className="rounded bg-gray-300 px-3 py-1 hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">Step {step.order + 1}</span>
                    <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs">
                      {step.type}
                    </span>
                    {step.chatbot && (
                      <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        Persona: {step.chatbot.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingStep(step)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(step.config, null, 2)}
                </pre>
              </>
            )}
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-sm text-gray-500">No steps yet. Add a step below.</p>
        )}
      </div>

      <div className="rounded border bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Add Step</h3>
        <div className="space-y-2">
          <select
            value={newStepType}
            onChange={(e) => setNewStepType(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="prompt">Prompt</option>
            <option value="agent">Agent</option>
            <option value="tool">Tool</option>
          </select>
          {newStepType === "prompt" && (
            <>
              <textarea
                placeholder="Enter prompt..."
                value={newStepPrompt}
                onChange={(e) => setNewStepPrompt(e.target.value)}
                className="w-full rounded border px-3 py-2"
                rows={3}
              />
              <select
                value={newStepModel}
                onChange={(e) => setNewStepModel(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">Select model...</option>
                {chatbots.map((bot) => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
            </>
          )}
          <select
            value={newStepChatbotId}
            onChange={(e) => setNewStepChatbotId(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">No Persona</option>
            {chatbots.map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
          <button
            onClick={addStep}
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            Add Step
          </button>
        </div>
      </div>
    </div>
  );
}
