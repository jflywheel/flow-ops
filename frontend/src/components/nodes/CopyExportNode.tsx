import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

interface Headline {
  text: string;
  type?: string;
}

interface CopyData {
  fear?: Headline[];
  greed?: Headline[];
  curiosity?: Headline[];
  urgency?: Headline[];
}

interface CopyExportNodeProps {
  data: {
    copy?: CopyData;
    inputValue?: string | CopyData;
  };
}

export default function CopyExportNode({ data }: CopyExportNodeProps) {
  const [exporting, setExporting] = useState(false);

  // Try to parse inputValue as copy if copy not directly provided
  let copy = data.copy;
  if (!copy && data.inputValue) {
    try {
      copy = typeof data.inputValue === "string"
        ? JSON.parse(data.inputValue)
        : data.inputValue;
    } catch {
      // Not valid JSON, ignore
    }
  }

  const angles = ["fear", "greed", "curiosity", "urgency"] as const;
  const angleCounts = angles.map((angle) => ({
    angle,
    count: copy?.[angle]?.length || 0,
  }));
  const totalCount = angleCounts.reduce((sum, a) => sum + a.count, 0);
  const hasCopy = totalCount > 0;

  const handleExportCSV = () => {
    if (!copy) return;

    setExporting(true);

    try {
      // Build CSV rows
      const rows: string[][] = [["Angle", "Type", "Text"]];

      angles.forEach((angle) => {
        const headlines = copy?.[angle] || [];
        headlines.forEach((headline) => {
          // Escape quotes in text
          const text = typeof headline === "string"
            ? headline
            : headline.text || "";
          const type = typeof headline === "object" ? headline.type || "" : "";
          const escapedText = text.replace(/"/g, '""');
          rows.push([angle, type, `"${escapedText}"`]);
        });
      });

      // Generate CSV
      const csv = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `copy-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const angleColors: Record<string, string> = {
    fear: "#ef4444",
    greed: "#22c55e",
    curiosity: "#3b82f6",
    urgency: "#f59e0b",
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        width: "280px",
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
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          C
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Copy Export
        </span>
      </div>

      {hasCopy ? (
        <>
          {/* Counts by angle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            {angleCounts.map(({ angle, count }) => (
              <div
                key={angle}
                style={{
                  padding: "10px 12px",
                  background: "#f5f5f7",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: angleColors[angle],
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#86868b",
                      textTransform: "capitalize",
                    }}
                  >
                    {angle}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#1d1d1f" }}>
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            style={{
              padding: "12px",
              background: "#fdf4ff",
              borderRadius: "8px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "#a855f7" }}>
              Total Headlines
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#7c3aed" }}>
              {totalCount}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: exporting
                ? "#e5e5e5"
                : "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
              color: exporting ? "#86868b" : "#fff",
              cursor: exporting ? "wait" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              transition: "transform 0.1s",
            }}
            onMouseDown={(e) => {
              if (!exporting) e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </>
      ) : (
        <div
          style={{
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
            C
          </div>
          <div style={{ fontSize: "14px", fontWeight: 500 }}>
            Connect copy data
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            Headlines will export to CSV
          </div>
        </div>
      )}
    </div>
  );
}
