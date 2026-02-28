import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generateAdvertorialCopy, setDebugContext } from "../../api";

// Ad copy angle structure from fwp-meta-advertorial
interface AdAngle {
  primaryText: string;
  headline: string;
}

interface AdCopyResult {
  fear: AdAngle;
  greed: AdAngle;
  curiosity: AdAngle;
  urgency: AdAngle;
}

interface GenerateAdvertorialCopyNodeProps {
  id: string;
  data: {
    inputValue: string; // JSON string with { content: string } or raw HTML content
    adCopy?: AdCopyResult;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

export default function GenerateAdvertorialCopyNode({ id, data }: GenerateAdvertorialCopyNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adCopy, setAdCopy] = useState<AdCopyResult | null>(data.adCopy || null);
  const [done, setDone] = useState(false);

  // Extract content from input (could be JSON with { content } or { headline, content })
  const getContent = (): string | null => {
    if (!data.inputValue) return null;

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(data.inputValue);
      // Could be { content: "..." } or { headline: "...", content: "..." }
      if (parsed.content) return parsed.content;
    } catch {
      // Not JSON, treat as raw HTML content
      if (data.inputValue.includes("<") && data.inputValue.includes(">")) {
        return data.inputValue;
      }
    }
    return null;
  };

  const content = getContent();
  const hasInput = !!content;

  const handleGenerate = async () => {
    if (!content) {
      setError("Connect advertorial content first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      setDebugContext({ nodeId: id, nodeName: "Advertorial Copy" });
      const result = await generateAdvertorialCopy(content);
      setAdCopy(result);
      setDone(true);

      // Store result and propagate to connected nodes
      data.updateNodeData?.(id, { adCopy: result });

      // Propagate the full ad copy object as JSON
      data.propagateData?.(id, JSON.stringify(result));
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
          background: "#ec4899",
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
            background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          C
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Ad Copy
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
          Advertorial content connected
        </div>
      )}

      {!hasInput && data.inputValue && (
        <div
          style={{
            background: "#fff5f5",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#ef4444",
            marginBottom: "10px",
          }}
        >
          Input must be advertorial HTML content
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
            : "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
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
        {loading ? "Generating..." : "Generate Ad Copy"}
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

      {done && adCopy && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#fdf2f8",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#be185d",
            lineHeight: "1.4",
          }}
        >
          <strong>4 angles generated</strong>
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#9d174d" }}>
            Fear, Greed, Curiosity, Urgency
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#f43f5e",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
