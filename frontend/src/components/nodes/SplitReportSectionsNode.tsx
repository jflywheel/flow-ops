import { Handle, Position } from "@xyflow/react";
import { useEffect } from "react";

interface ReportSection {
  title: string;
  hook?: string;
  content?: string;
}

interface Report {
  executiveSummary?: string;
  sections: ReportSection[];
}

interface SplitReportSectionsNodeProps {
  id: string;
  data: {
    report?: Report;
    inputValue?: string | Report;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, data: unknown, handleId: string) => void;
  };
}

// Maximum sections we support (handles are static)
const MAX_SECTIONS = 12;

export default function SplitReportSectionsNode({ id, data }: SplitReportSectionsNodeProps) {
  // Try to parse inputValue as report if report not directly provided
  let report = data.report;
  if (!report && data.inputValue) {
    try {
      report = typeof data.inputValue === "string"
        ? JSON.parse(data.inputValue)
        : data.inputValue;
    } catch {
      // Not valid JSON, ignore
    }
  }

  const sections = report?.sections || [];
  const sectionCount = Math.min(sections.length, MAX_SECTIONS);

  // Propagate sections when report changes
  useEffect(() => {
    if (sections.length > 0 && data.updateNodeData) {
      const sectionOutputs: Record<string, ReportSection> = {};
      sections.slice(0, MAX_SECTIONS).forEach((section, index) => {
        sectionOutputs[`section_${index}`] = section;
      });
      data.updateNodeData(id, { sectionOutputs, sectionCount: sections.length });
    }
  }, [sections, data, id]);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        width: "240px",
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
          background: "#6366f1",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          S
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Split Sections
        </span>
      </div>

      {/* Section list with output handles */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {sectionCount > 0 ? (
          sections.slice(0, MAX_SECTIONS).map((section, index) => (
            <div
              key={index}
              style={{
                position: "relative",
                padding: "8px 10px",
                paddingRight: "24px",
                background: "#f5f5f7",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#1d1d1f",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ color: "#6366f1", marginRight: "6px" }}>
                {index + 1}.
              </span>
              {section.title}
              <Handle
                type="source"
                position={Position.Right}
                id={`section_${index}`}
                style={{
                  width: "10px",
                  height: "10px",
                  background: "#818cf8",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          ))
        ) : (
          // Empty state with placeholder handles
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              style={{
                position: "relative",
                padding: "8px 10px",
                paddingRight: "24px",
                background: "#f5f5f7",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#c5c5c5",
              }}
            >
              <span style={{ marginRight: "6px" }}>{index + 1}.</span>
              Section {index + 1}
              <Handle
                type="source"
                position={Position.Right}
                id={`section_${index}`}
                style={{
                  width: "10px",
                  height: "10px",
                  background: "#d1d5db",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          ))
        )}
      </div>

      {sectionCount > MAX_SECTIONS && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "#f59e0b",
            textAlign: "center",
          }}
        >
          +{sections.length - MAX_SECTIONS} more sections (max {MAX_SECTIONS} outputs)
        </div>
      )}

      {!report && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "11px",
            color: "#86868b",
            textAlign: "center",
          }}
        >
          Connect a report to split
        </div>
      )}
    </div>
  );
}
