import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generateCopy, setDebugContext } from "../../api";
import ContentModal from "../ContentModal";

interface CopyVariant {
  headline: string;
  body: string;
  cta: string;
}

interface CopyOutput {
  fear: CopyVariant;
  greed: CopyVariant;
  curiosity: CopyVariant;
  urgency: CopyVariant;
}

interface GenerateCopyNodeProps {
  id: string;
  data: {
    // Input: report object
    report?: {
      executiveSummary: string;
      sections: Array<{ title: string; content: string }>;
    };
    // Output
    copy?: CopyOutput;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, data: Record<string, unknown>) => void;
  };
}

export default function GenerateCopyNode({ id, data }: GenerateCopyNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copy, setCopy] = useState<CopyOutput | null>(data.copy || null);
  const [showOptions, setShowOptions] = useState(false);
  const [platform, setPlatform] = useState<"google" | "meta">("google");
  const [mode, setMode] = useState<"report" | "newsletter">("report");
  const [modalOpen, setModalOpen] = useState(false);

  const report = data.report;

  const handleGenerate = async () => {
    if (!report) {
      setError("Connect a report input first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setDebugContext({ nodeId: id, nodeName: "Generate Copy" });
      const result = await generateCopy(report, platform, mode);
      setCopy(result);
      data.updateNodeData?.(id, { copy: result });
      data.propagateData?.(id, { copy: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Count how many headline variants we have
  const headlineCount = copy ? Object.keys(copy).length : 0;

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
            background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
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
          Generate Copy
        </span>
      </div>

      {/* Input indicator */}
      {report && (
        <div
          style={{
            background: "#f5f5f7",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#86868b",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "14px" }}>📄</span>
          <span>Report connected</span>
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
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                fontSize: "10px",
                color: "#86868b",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "google" | "meta")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="google">Google</option>
              <option value="meta">Meta</option>
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: "10px",
                color: "#86868b",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "report" | "newsletter")}
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
            </select>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
          color: loading ? "#86868b" : "#fff",
          cursor: loading ? "wait" : "pointer",
          fontSize: "13px",
          fontWeight: 500,
          transition: "transform 0.1s",
        }}
        onMouseDown={(e) => {
          if (!loading) e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {loading ? "Generating..." : "Generate Copy"}
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

      {copy && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#fdf2f8",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#9d174d",
            lineHeight: "1.4",
            cursor: "pointer",
          }}
          title="Click to expand"
        >
          {headlineCount} headline variants generated
          <div style={{ fontSize: "10px", color: "#ec4899", marginTop: "4px" }}>
            Click to expand
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generated Copy"
        content={copy || {}}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#be185d",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
