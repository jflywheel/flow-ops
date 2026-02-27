import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { summarize } from "../../api";
import ContentModal from "../ContentModal";

interface SummarizeNodeProps {
  id: string;
  data: {
    inputValue: string; // Text to summarize (string or { text: string })
    summary?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

export default function SummarizeNode({ id, data }: SummarizeNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(data.summary || "");
  const [done, setDone] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Options
  const [maxLength, setMaxLength] = useState(200);

  // Extract text from input (could be string or { text: string })
  const getText = (): string | null => {
    if (!data.inputValue) return null;

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(data.inputValue);
      if (typeof parsed.text === "string") return parsed.text;
      if (typeof parsed === "string") return parsed;
    } catch {
      // Not JSON, use as-is if it's a string
    }

    // Use raw input value as text
    if (typeof data.inputValue === "string" && data.inputValue.trim()) {
      return data.inputValue;
    }

    return null;
  };

  const inputText = getText();
  const hasInput = !!inputText;

  const handleSummarize = async () => {
    if (!inputText) {
      setError("Connect a text input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      const result = await summarize(inputText, maxLength);
      setSummary(result.summary);
      setDone(true);

      // Store result and propagate to connected nodes
      data.updateNodeData?.(id, { summary: result.summary });

      // Propagate the summary as JSON
      data.propagateData?.(id, JSON.stringify({ summary: result.summary }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summarization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        width: "220px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e5e5e5",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: "12px",
          height: "12px",
          background: "#f97316",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          S
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Summarize
        </span>
      </div>

      {/* Input preview */}
      {hasInput && (
        <div
          style={{
            background: "#f5f5f7",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#86868b",
            marginBottom: "10px",
            lineHeight: "1.4",
            maxHeight: "40px",
            overflow: "hidden",
          }}
        >
          {inputText.slice(0, 60)}
          {inputText.length > 60 && "..."}
        </div>
      )}

      {/* Options toggle */}
      <div
        onClick={() => setShowOptions(!showOptions)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "11px",
          color: "#86868b",
          cursor: "pointer",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "10px" }}>{showOptions ? "▼" : "▶"}</span>
        <span>Options</span>
      </div>

      {showOptions && (
        <div style={{ marginBottom: "10px" }}>
          {/* Max length slider */}
          <div>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Max length: {maxLength} words
            </label>
            <input
              type="range"
              min={100}
              max={500}
              step={50}
              value={maxLength}
              onChange={(e) => setMaxLength(parseInt(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#f97316",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#86868b" }}>
              <span>100</span>
              <span>500</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSummarize}
        disabled={loading || !hasInput}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading || !hasInput
            ? "#e5e5e5"
            : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          color: loading || !hasInput ? "#86868b" : "#fff",
          cursor: loading ? "wait" : !hasInput ? "not-allowed" : "pointer",
          fontSize: "13px",
          fontWeight: 500,
          transition: "transform 0.1s",
        }}
        onMouseDown={(e) => {
          if (!loading && hasInput) e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {loading ? "Summarizing..." : "Summarize"}
      </button>

      {error && (
        <div
          style={{
            color: "#ff3b30",
            fontSize: "11px",
            marginTop: "8px",
            padding: "6px 8px",
            background: "#fff5f5",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      {done && summary && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#fff7ed",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#c2410c",
            lineHeight: "1.4",
            maxHeight: "80px",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          {summary.slice(0, 150)}
          {summary.length > 150 && "..."}
          <div style={{ fontSize: "10px", color: "#f97316", marginTop: "4px" }}>
            Click to expand
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Summary"
        content={summary}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#ea580c",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
