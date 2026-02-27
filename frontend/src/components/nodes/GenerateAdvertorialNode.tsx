import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generateAdvertorial } from "../../api";
import ContentModal from "../ContentModal";

// Report structure from fwp-report-generator
interface ReportSection {
  id: string;
  title: string;
  hook: string;
  content: string;
  stockPicks: string[];
  keyNumbers: string[];
}

interface Report {
  title?: string;
  date?: string;
  executiveSummary?: string;
  sections?: ReportSection[];
}

interface GenerateAdvertorialNodeProps {
  id: string;
  data: {
    inputValue: string; // JSON string of report object
    report?: Report;
    headline?: string;
    content?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

export default function GenerateAdvertorialNode({ id, data }: GenerateAdvertorialNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [headline, setHeadline] = useState(data.headline || "");
  const [content, setContent] = useState(data.content || "");
  const [done, setDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Try to parse input as report object
  const getReport = (): Report | null => {
    if (data.report) return data.report;
    if (!data.inputValue) return null;
    try {
      return JSON.parse(data.inputValue);
    } catch {
      return null;
    }
  };

  const report = getReport();
  const hasInput = report && (report.executiveSummary || report.sections);

  const handleGenerate = async () => {
    if (!report) {
      setError("Connect a report input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      const result = await generateAdvertorial(report as Record<string, unknown>);
      setHeadline(result.headline);
      setContent(result.content);
      setDone(true);

      // Store result and propagate to connected nodes
      data.updateNodeData?.(id, {
        headline: result.headline,
        content: result.content
      });

      // Propagate the full advertorial object as JSON
      const outputData = JSON.stringify({
        headline: result.headline,
        content: result.content
      });
      data.propagateData?.(id, outputData);
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
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          A
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Advertorial
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
          Report: {report?.title || report?.executiveSummary?.slice(0, 40) || "Connected"}...
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
          Input must be a report object
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
            : "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
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
        {loading ? "Generating..." : "Generate Advertorial"}
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

      {done && headline && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#f0fdf4",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#16a34a",
            lineHeight: "1.4",
            maxHeight: "60px",
            overflow: "hidden",
            cursor: "pointer",
          }}
          title="Click to expand"
        >
          <strong>Headline:</strong> {headline.slice(0, 80)}
          {headline.length > 80 && "..."}
          <div style={{ fontSize: "10px", color: "#22c55e", marginTop: "4px" }}>
            Click to expand
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Advertorial"
        content={`<h1>${headline}</h1>\n${content}`}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#6366f1",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
