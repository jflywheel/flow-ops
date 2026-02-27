import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generateLandingPages } from "../../api";
import ContentModal from "../ContentModal";

interface LandingPage {
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  heroContent: string;
}

interface LandingPagesOutput {
  fear: LandingPage;
  greed: LandingPage;
  curiosity: LandingPage;
  urgency: LandingPage;
}

interface GenerateLandingPagesNodeProps {
  id: string;
  data: {
    // Input: report object
    report?: {
      executiveSummary: string;
      sections: Array<{ title: string; content: string }>;
    };
    // Output
    landingPages?: LandingPagesOutput;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, data: Record<string, unknown>) => void;
  };
}

export default function GenerateLandingPagesNode({ id, data }: GenerateLandingPagesNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [landingPages, setLandingPages] = useState<LandingPagesOutput | null>(
    data.landingPages || null
  );
  const [showOptions, setShowOptions] = useState(false);
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
      const result = await generateLandingPages(report, mode);
      setLandingPages(result);
      data.updateNodeData?.(id, { landingPages: result });
      data.propagateData?.(id, { landingPages: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Landing page generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Count how many pages we have
  const pageCount = landingPages ? Object.keys(landingPages).length : 0;

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
            background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          L
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Landing Pages
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
            : "linear-gradient(135deg, #10b981 0%, #047857 100%)",
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
        {loading ? "Generating..." : "Generate Pages"}
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

      {landingPages && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#ecfdf5",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#065f46",
            lineHeight: "1.4",
            cursor: "pointer",
          }}
        >
          {pageCount} pages generated
          <div style={{ fontSize: "10px", color: "#10b981", marginTop: "4px" }}>
            Click to expand
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Landing Pages"
        content={landingPages || {}}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#047857",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
