import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generateVisualConcepts } from "../../api";

// Visual concept structure from fwp-image-generator
interface VisualConcept {
  concept: string;
  targetEmotion: string;
  colorScheme: string;
}

interface Report {
  title?: string;
  executiveSummary?: string;
  sections?: Array<{
    title: string;
    hook: string;
    stockPicks?: string[];
    keyNumbers?: string[];
  }>;
}

interface GenerateVisualConceptsNodeProps {
  id: string;
  data: {
    inputValue: string; // JSON string of report object OR advertorial content
    concepts?: VisualConcept[];
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

type ModeType = "report" | "newsletter" | "advertorial";

export default function GenerateVisualConceptsNode({ id, data }: GenerateVisualConceptsNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [concepts, setConcepts] = useState<VisualConcept[]>(data.concepts || []);
  const [done, setDone] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Options
  const [count, setCount] = useState(8);
  const [mode, setMode] = useState<ModeType>("report");

  // Parse input to determine type
  const parseInput = (): { report?: Report; advertorialContent?: string } | null => {
    if (!data.inputValue) return null;

    try {
      const parsed = JSON.parse(data.inputValue);

      // Check if it's a report (has sections or executiveSummary)
      if (parsed.sections || parsed.executiveSummary) {
        return { report: parsed };
      }

      // Check if it's advertorial output (has headline and content)
      if (parsed.headline && parsed.content) {
        return { advertorialContent: parsed.content };
      }

      // Check if it's just { content: ... }
      if (parsed.content) {
        return { advertorialContent: parsed.content };
      }
    } catch {
      // Not JSON, might be raw HTML advertorial content
      if (data.inputValue.includes("<") && data.inputValue.includes(">")) {
        return { advertorialContent: data.inputValue };
      }
    }

    return null;
  };

  const parsedInput = parseInput();
  const hasInput = !!parsedInput;

  const handleGenerate = async () => {
    if (!parsedInput) {
      setError("Connect a report or advertorial input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      const result = await generateVisualConcepts(
        (parsedInput.report || {}) as Record<string, unknown>,
        count,
        mode,
        parsedInput.advertorialContent
      );

      setConcepts(result.concepts);
      setDone(true);

      // Store result and propagate to connected nodes
      data.updateNodeData?.(id, { concepts: result.concepts });

      // Propagate the concepts array as JSON
      data.propagateData?.(id, JSON.stringify({ concepts: result.concepts }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
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
          background: "#14b8a6",
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
            background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          V
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Visual Concepts
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
          }}
        >
          {parsedInput?.report ? "Report connected" : "Advertorial connected"}
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
          {/* Count input */}
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Number of concepts
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 8)))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Mode dropdown */}
          <div>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ModeType)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="report">Report</option>
              <option value="newsletter">Newsletter</option>
              <option value="advertorial">Advertorial</option>
            </select>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !hasInput}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading || !hasInput
            ? "#e5e5e5"
            : "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
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
        {loading ? "Generating..." : "Generate Concepts"}
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

      {done && concepts.length > 0 && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#f0fdfa",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#0d9488",
            lineHeight: "1.4",
          }}
        >
          <strong>{concepts.length} concepts generated</strong>
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#14b8a6" }}>
            {concepts[0]?.targetEmotion || "Ready to use"}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#0d9488",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
