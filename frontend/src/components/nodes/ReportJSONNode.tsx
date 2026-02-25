import { Handle, Position } from "@xyflow/react";
import { useState, useRef } from "react";

interface ReportSection {
  title: string;
  content: string;
}

interface Report {
  executiveSummary: string;
  sections: ReportSection[];
  [key: string]: unknown;
}

interface ReportJSONNodeProps {
  id: string;
  data: {
    report?: Report;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

export default function ReportJSONNode({ id, data }: ReportJSONNodeProps) {
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(data.report || null);
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateReport = (obj: unknown): Report => {
    if (!obj || typeof obj !== "object") {
      throw new Error("Invalid JSON: must be an object");
    }

    const reportObj = obj as Record<string, unknown>;

    if (!reportObj.executiveSummary || typeof reportObj.executiveSummary !== "string") {
      throw new Error("Missing or invalid 'executiveSummary' field");
    }

    if (!Array.isArray(reportObj.sections)) {
      throw new Error("Missing or invalid 'sections' array");
    }

    for (const section of reportObj.sections) {
      if (!section.title || !section.content) {
        throw new Error("Each section must have 'title' and 'content' fields");
      }
    }

    return reportObj as Report;
  };

  const handleParse = () => {
    if (!jsonText.trim()) {
      setError("Paste or enter JSON first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const parsed = JSON.parse(jsonText);
      const validatedReport = validateReport(parsed);
      setReport(validatedReport);

      data.updateNodeData?.(id, { report: validatedReport });
      data.propagateData?.(id, validatedReport);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON syntax");
      } else {
        setError(err instanceof Error ? err.message : "Failed to parse JSON");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please select a JSON file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validatedReport = validateReport(parsed);
      setReport(validatedReport);
      setJsonText(text);

      data.updateNodeData?.(id, { report: validatedReport });
      data.propagateData?.(id, validatedReport);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON syntax in file");
      } else {
        setError(err instanceof Error ? err.message : "Failed to read file");
      }
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
        width: "260px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e5e5e5",
      }}
    >
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
            background: "#8e44ad",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "9px",
            fontWeight: 600,
          }}
        >
          { }
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Report JSON
        </span>
      </div>

      {/* Mode toggle */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "10px",
        }}
      >
        <button
          onClick={() => setMode("paste")}
          style={{
            flex: 1,
            padding: "6px",
            borderRadius: "8px",
            border: "none",
            background: mode === "paste" ? "#8e44ad" : "#f5f5f5",
            color: mode === "paste" ? "#fff" : "#86868b",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          Paste
        </button>
        <button
          onClick={() => setMode("upload")}
          style={{
            flex: 1,
            padding: "6px",
            borderRadius: "8px",
            border: "none",
            background: mode === "upload" ? "#8e44ad" : "#f5f5f5",
            color: mode === "upload" ? "#fff" : "#86868b",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          Upload
        </button>
      </div>

      {mode === "paste" ? (
        <>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"executiveSummary": "...", "sections": [...]}'
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #e5e5e5",
              background: "#fafafa",
              color: "#1d1d1f",
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: "11px",
              lineHeight: "1.4",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleParse}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: loading ? "#e5e5e5" : "#8e44ad",
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
            {loading ? "Parsing..." : "Parse JSON"}
          </button>
        </>
      ) : (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,application/json"
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: loading ? "#e5e5e5" : "#8e44ad",
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
            {loading ? "Processing..." : "Select JSON File"}
          </button>
        </>
      )}

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
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#faf5ff",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#6b21a8",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Report loaded</div>
          <div style={{ fontSize: "10px", color: "#8e44ad" }}>
            {report.sections.length} section{report.sections.length !== 1 ? "s" : ""}
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "10px",
              color: "#86868b",
              maxHeight: "40px",
              overflow: "hidden",
            }}
          >
            {report.executiveSummary.slice(0, 80)}
            {report.executiveSummary.length > 80 && "..."}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#8e44ad",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
