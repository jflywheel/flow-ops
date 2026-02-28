// ChatPanel - persistent bottom bar for building flows with natural language
// Sends messages to Claude Haiku, which returns actions (add nodes, connect, load presets)

import { useState, useRef, useEffect, useCallback } from "react";
import { chat, type ChatAction, type ChatResponse } from "../api";
import type { Node, Edge } from "@xyflow/react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  nodes: Node[];
  edges: Edge[];
  // Batch add: creates multiple nodes at once, laid out left-to-right, returns array of IDs
  onAddNodes: (
    nodes: { nodeType: string; data: Record<string, unknown> }[]
  ) => string[];
  onAddEdge: (sourceId: string, targetId: string) => void;
  onLoadPreset: (presetName: string) => void;
  onClearCanvas: (skipConfirm?: boolean) => void;
  darkMode?: boolean;
  isMobile?: boolean;
}

export default function ChatPanel({
  nodes,
  edges,
  onAddNodes,
  onAddEdge,
  onLoadPreset,
  onClearCanvas,
  darkMode = false,
  isMobile = false,
}: ChatPanelProps) {
  const ct = darkMode
    ? { bg: "#1a1a1a", border: "#333", inputBg: "#2a2a2a", inputBorder: "#444", text: "#e5e5e5", muted: "#888", msgBg: "#2a2a2a", userBg: "#3b82f6" }
    : { bg: "#fff", border: "#e5e5e5", inputBg: "#f9f9f9", inputBorder: "#e5e5e5", text: "#1d1d1f", muted: "#86868b", msgBg: "#f5f5f7", userBg: "#1d1d1f" };
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, expanded]);

  // Focus input on mount and when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [expanded]);

  // Execute actions returned by the AI
  const executeActions = useCallback(
    (actions: ChatAction[]) => {
      // Collect all addNode actions first, then batch-create them with proper layout
      const nodeActions = actions.filter((a) => a.type === "addNode" && a.nodeType);
      const connectActions = actions.filter((a) => a.type === "connectNodes");
      const presetActions = actions.filter((a) => a.type === "loadPreset");

      // Load presets first (replaces canvas)
      for (const action of presetActions) {
        if (action.presetName) {
          onLoadPreset(action.presetName);
        }
      }

      // Batch-add nodes with left-to-right layout
      let createdNodeIds: string[] = [];
      if (nodeActions.length > 0) {
        createdNodeIds = onAddNodes(
          nodeActions.map((a) => ({
            nodeType: a.nodeType!,
            data: a.data || {},
          }))
        );
      }

      // Connect nodes using the indices from the AI response
      for (const action of connectActions) {
        const srcId = createdNodeIds[action.sourceIndex ?? 0];
        const tgtId = createdNodeIds[action.targetIndex ?? 0];
        if (srcId && tgtId) {
          onAddEdge(srcId, tgtId);
        }
      }
    },
    [onAddNodes, onAddEdge, onLoadPreset]
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Handle "clear" locally without calling the API
    if (trimmed.toLowerCase() === "clear") {
      setInput("");
      onClearCanvas(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "Canvas cleared." },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    // Expand to show the response
    setExpanded(true);

    try {
      const response: ChatResponse = await chat(
        trimmed,
        nodes.map((n) => ({
          id: n.id,
          type: n.type || "",
          position: n.position,
        })),
        edges.map((e) => ({ source: e.source, target: e.target }))
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);

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

  return (
    <div
      style={{
        borderTop: `1px solid ${ct.border}`,
        background: ct.bg,
        display: "flex",
        justifyContent: "center",
        transition: "height 0.2s ease",
        height: expanded ? "240px" : "56px",
        flexShrink: 0,
      }}
    >
    <div
      style={{
        width: isMobile ? "100%" : "50%",
        minWidth: isMobile ? 0 : "400px",
        maxWidth: isMobile ? "100%" : "800px",
        display: "flex",
        flexDirection: "column",
        ...(isMobile ? { padding: "0 4px" } : {}),
      }}
    >
      {/* Message history (visible when expanded) */}
      {expanded && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minHeight: 0,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: ct.muted,
                fontSize: "12px",
                marginTop: "20px",
                lineHeight: 1.5,
              }}
            >
              Try: "Add a text input connected to a photo generator" or "Load the Podcast to Report preset"
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
                  maxWidth: "70%",
                  padding: "8px 12px",
                  borderRadius:
                    msg.role === "user"
                      ? "12px 12px 4px 12px"
                      : "12px 12px 12px 4px",
                  background:
                    msg.role === "user" ? ct.userBg : ct.msgBg,
                  color: msg.role === "user" ? "#fff" : ct.text,
                  fontSize: "12px",
                  lineHeight: 1.4,
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
                  padding: "8px 12px",
                  borderRadius: "12px 12px 12px 4px",
                  background: ct.msgBg,
                  color: ct.muted,
                  fontSize: "12px",
                }}
              >
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar (always visible) */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          borderTop: expanded ? `1px solid ${ct.border}` : "none",
        }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            border: `1px solid ${ct.inputBorder}`,
            background: expanded ? ct.inputBg : ct.bg,
            color: ct.muted,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          title={expanded ? "Collapse chat" : "Expand chat"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {/* Chat icon label */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={ct.muted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: `1px solid ${ct.inputBorder}`,
            background: ct.inputBg,
            fontSize: "13px",
            outline: "none",
            color: ct.text,
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#0071e3";
            e.currentTarget.style.background = darkMode ? "#333" : "#fff";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = ct.inputBorder;
            e.currentTarget.style.background = ct.inputBg;
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "none",
            background:
              loading || !input.trim() ? "#d1d1d6" : "#34c759",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
            cursor: loading || !input.trim() ? "default" : "pointer",
            transition: "background 0.15s",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>{/* end inner 50% container */}
    </div>
  );
}
