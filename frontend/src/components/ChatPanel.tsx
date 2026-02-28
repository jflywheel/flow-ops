// ChatPanel - floating chat interface for building flows with natural language
// Sends messages to Claude Haiku, which returns actions (add nodes, connect, load presets)

import { useState, useRef, useEffect, useCallback } from "react";
import { chat, type ChatAction, type ChatResponse } from "../api";
import type { Node, Edge } from "@xyflow/react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  // Current canvas state
  nodes: Node[];
  edges: Edge[];
  // Callbacks to manipulate the canvas
  onAddNode: (nodeType: string, data: Record<string, unknown>) => string; // returns new node id
  onAddEdge: (sourceId: string, targetId: string) => void;
  onLoadPreset: (presetName: string) => void;
}

export default function ChatPanel({
  nodes,
  edges,
  onAddNode,
  onAddEdge,
  onLoadPreset,
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Execute actions returned by the AI
  const executeActions = useCallback(
    (actions: ChatAction[]) => {
      // Track node IDs created by addNode actions (for connectNodes references)
      const createdNodeIds: string[] = [];

      for (const action of actions) {
        switch (action.type) {
          case "addNode": {
            if (action.nodeType) {
              const nodeId = onAddNode(action.nodeType, action.data || {});
              createdNodeIds.push(nodeId);
            }
            break;
          }
          case "connectNodes": {
            const srcId = createdNodeIds[action.sourceIndex ?? 0];
            const tgtId = createdNodeIds[action.targetIndex ?? 0];
            if (srcId && tgtId) {
              onAddEdge(srcId, tgtId);
            }
            break;
          }
          case "loadPreset": {
            if (action.presetName) {
              onLoadPreset(action.presetName);
            }
            break;
          }
        }
      }
    },
    [onAddNode, onAddEdge, onLoadPreset]
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      // Send to backend with current canvas context
      const response: ChatResponse = await chat(
        trimmed,
        nodes.map((n) => ({
          id: n.id,
          type: n.type || "",
          position: n.position,
        })),
        edges.map((e) => ({ source: e.source, target: e.target }))
      );

      // Add assistant reply
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);

      // Execute any actions
      if (response.actions && response.actions.length > 0) {
        executeActions(response.actions);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Toggle button (always visible)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "#1d1d1f",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        }}
        title="Chat with AI"
      >
        {/* Chat bubble icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  // Full chat panel
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "380px",
        height: "480px",
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: "hidden",
        border: "1px solid #e5e5e5",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #e5e5e5",
          background: "#fafafa",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#1d1d1f",
              letterSpacing: "-0.2px",
            }}
          >
            Flow Assistant
          </div>
          <div style={{ fontSize: "11px", color: "#86868b" }}>
            Describe what you want to build
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "none",
            background: "#e5e5e5",
            color: "#86868b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            lineHeight: 1,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#d1d1d6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#e5e5e5";
          }}
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#86868b",
              fontSize: "13px",
              marginTop: "40px",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d1d1d6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline-block" }}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            Try something like:
            <br />
            "Add a text input connected to a photo generator"
            <br />
            "Load the Podcast to Report preset"
            <br />
            "Add a summarize node"
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent:
                msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius:
                  msg.role === "user"
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                background:
                  msg.role === "user" ? "#1d1d1f" : "#f5f5f7",
                color: msg.role === "user" ? "#fff" : "#1d1d1f",
                fontSize: "13px",
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "14px 14px 14px 4px",
                background: "#f5f5f7",
                color: "#86868b",
                fontSize: "13px",
              }}
            >
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #e5e5e5",
          display: "flex",
          gap: "8px",
          background: "#fafafa",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to build?"
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #e5e5e5",
            background: "#fff",
            fontSize: "13px",
            outline: "none",
            color: "#1d1d1f",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#0071e3";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e5e5e5";
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background:
              loading || !input.trim() ? "#d1d1d6" : "#1d1d1f",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
            cursor: loading || !input.trim() ? "default" : "pointer",
            transition: "background 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
