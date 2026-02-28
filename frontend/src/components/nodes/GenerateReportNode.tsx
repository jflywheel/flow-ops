import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generateReport, setDebugContext } from "../../api";
import ContentModal from "../ContentModal";

interface ReportOutput {
  executiveSummary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

interface GenerateReportNodeProps {
  id: string;
  data: {
    // Input: transcript or plain text
    transcript?: string;
    inputValue?: string;
    // Output
    report?: ReportOutput;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, data: Record<string, unknown>) => void;
  };
}

export default function GenerateReportNode({ id, data }: GenerateReportNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportOutput | null>(data.report || null);
  const [showOptions, setShowOptions] = useState(false);
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Accept transcript or plain text input
  const inputText = data.transcript || data.inputValue || "";

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError("Connect a transcript or text input first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setDebugContext({ nodeId: id, nodeName: "Generate Report" });
      const result = await generateReport(inputText, episodeTitle);
      setReport(result);
      data.updateNodeData?.(id, { report: result });
      data.propagateData?.(id, { report: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
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
          background: "#8b5cf6",
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
            background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          R
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Generate Report
        </span>
      </div>

      {/* Input preview */}
      {inputText && (
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
          <label
            style={{
              fontSize: "10px",
              color: "#86868b",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Episode Title (optional)
          </label>
          <input
            type="text"
            value={episodeTitle}
            onChange={(e) => setEpisodeTitle(e.target.value)}
            placeholder="e.g., Episode 42: The Future"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              fontSize: "11px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
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
            : "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
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
        {loading ? "Generating..." : "Generate Report"}
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

      {report && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#f5f3ff",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#5b21b6",
            lineHeight: "1.4",
            maxHeight: "60px",
            overflow: "hidden",
            cursor: "pointer",
          }}
          title="Click to expand"
        >
          <strong>Summary:</strong> {report.executiveSummary.slice(0, 80)}
          {report.executiveSummary.length > 80 && "..."}
          <div style={{ fontSize: "10px", color: "#8b5cf6", marginTop: "4px" }}>
            Click to expand
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generated Report"
        content={report || {}}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#6d28d9",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
