import { Handle, Position } from "@xyflow/react";

interface ReportSection {
  title: string;
  hook: string;
  content?: string;
}

interface Report {
  executiveSummary: string;
  sections: ReportSection[];
}

interface ReportPreviewNodeProps {
  data: {
    report?: Report;
    inputValue?: string;
  };
}

export default function ReportPreviewNode({ data }: ReportPreviewNodeProps) {
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

  const hasReport = report && (report.executiveSummary || report.sections?.length);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        width: "380px",
        maxHeight: "500px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e5e5e5",
        display: "flex",
        flexDirection: "column",
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
          gap: "10px",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          R
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Report Preview
        </span>
      </div>

      {hasReport ? (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Executive Summary */}
          {report?.executiveSummary && (
            <div
              style={{
                padding: "16px",
                background: "linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)",
                borderRadius: "12px",
                border: "1px solid #e9d5ff",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#7c3aed",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                Executive Summary
              </div>
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#1d1d1f",
                }}
              >
                {report.executiveSummary}
              </div>
            </div>
          )}

          {/* Sections */}
          {report?.sections && report.sections.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#86868b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Sections ({report.sections.length})
              </div>
              {report.sections.map((section, index) => (
                <div
                  key={index}
                  style={{
                    padding: "12px",
                    background: "#f5f5f7",
                    borderRadius: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1d1d1f",
                      marginBottom: "4px",
                    }}
                  >
                    {index + 1}. {section.title}
                  </div>
                  {section.hook && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                    >
                      "{section.hook}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            background: "#f5f5f7",
            borderRadius: "12px",
            color: "#86868b",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#e8e8ed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              marginBottom: "12px",
            }}
          >
            R
          </div>
          <div style={{ fontSize: "14px", fontWeight: 500 }}>
            Connect a report source
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            Report will preview here
          </div>
        </div>
      )}
    </div>
  );
}
