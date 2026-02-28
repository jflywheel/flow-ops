import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { extractKeyPoints, setDebugContext } from "../../api";
import ContentModal from "../ContentModal";

interface ExtractKeyPointsNodeProps {
  id: string;
  data: {
    inputValue: string; // Text to extract from (string or { text: string })
    points?: string[];
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

export default function ExtractKeyPointsNode({ id, data }: ExtractKeyPointsNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<string[]>(data.points || []);
  const [done, setDone] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Options
  const [maxPoints, setMaxPoints] = useState(5);

  // Extract text from input (could be string, { text: string }, or report object)
  const getText = (): string | null => {
    if (!data.inputValue) return null;

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(data.inputValue);

      // Handle report object (has executiveSummary and sections)
      if (parsed.executiveSummary || parsed.sections) {
        const parts: string[] = [];
        if (parsed.executiveSummary) {
          parts.push(parsed.executiveSummary);
        }
        if (parsed.sections && Array.isArray(parsed.sections)) {
          for (const section of parsed.sections) {
            if (section.content) parts.push(section.content);
          }
        }
        return parts.join("\n\n");
      }

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

  const handleExtract = async () => {
    if (!inputText) {
      setError("Connect a text input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      setDebugContext({ nodeId: id, nodeName: "Key Points" });
      const result = await extractKeyPoints(inputText, maxPoints);
      setPoints(result.points);
      setDone(true);

      // Store result and propagate to connected nodes
      data.updateNodeData?.(id, { points: result.points });

      // Propagate the points as JSON
      data.propagateData?.(id, JSON.stringify({ points: result.points }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
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
          background: "#10b981",
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
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          K
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Key Points
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
          {/* Max points selector */}
          <div>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Max points: {maxPoints}
            </label>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={maxPoints}
              onChange={(e) => setMaxPoints(parseInt(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#10b981",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#86868b" }}>
              <span>3</span>
              <span>10</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleExtract}
        disabled={loading || !hasInput}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading || !hasInput
            ? "#e5e5e5"
            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
        {loading ? "Extracting..." : "Extract"}
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

      {done && points.length > 0 && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#ecfdf5",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#047857",
            lineHeight: "1.5",
            maxHeight: "100px",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          {points.slice(0, 3).map((point, i) => (
            <div key={i} style={{ marginBottom: "4px" }}>
              • {point.slice(0, 40)}{point.length > 40 && "..."}
            </div>
          ))}
          <div style={{ fontSize: "10px", color: "#10b981", marginTop: "4px" }}>
            Click to expand ({points.length} points)
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Key Points"
        content={points.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#059669",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
