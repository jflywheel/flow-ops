import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

interface LandingPage {
  html?: string;
  headline?: string;
  content?: string;
}

interface LandingPagesData {
  fear?: LandingPage;
  greed?: LandingPage;
  curiosity?: LandingPage;
  urgency?: LandingPage;
}

interface LandingPagePreviewNodeProps {
  data: {
    landingPages?: LandingPagesData;
    inputValue?: string | LandingPagesData;
  };
}

const angles = ["fear", "greed", "curiosity", "urgency"] as const;
type Angle = typeof angles[number];

const angleColors: Record<Angle, string> = {
  fear: "#ef4444",
  greed: "#22c55e",
  curiosity: "#3b82f6",
  urgency: "#f59e0b",
};

export default function LandingPagePreviewNode({ data }: LandingPagePreviewNodeProps) {
  const [activeTab, setActiveTab] = useState<Angle>("fear");
  const [copied, setCopied] = useState(false);

  // Try to parse inputValue as landingPages if not directly provided
  let pages = data.landingPages;
  if (!pages && data.inputValue) {
    try {
      pages = typeof data.inputValue === "string"
        ? JSON.parse(data.inputValue)
        : data.inputValue;
    } catch {
      // Not valid JSON, ignore
    }
  }

  const availableAngles = angles.filter((angle) => pages?.[angle]);
  const hasPages = availableAngles.length > 0;
  const currentPage = pages?.[activeTab];

  const handleCopyHTML = async () => {
    if (!currentPage) return;

    const html = currentPage.html || buildHTML(currentPage);
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build basic HTML from headline/content if no html property
  const buildHTML = (page: LandingPage): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.headline || "Landing Page"}</title>
</head>
<body>
  <h1>${page.headline || ""}</h1>
  <div>${page.content || ""}</div>
</body>
</html>`;
  };

  const getPreviewHTML = (page: LandingPage): string => {
    if (page.html) return page.html;
    return `<div style="padding: 20px; font-family: system-ui, sans-serif;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">${page.headline || ""}</h1>
      <div style="line-height: 1.6;">${page.content || ""}</div>
    </div>`;
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        width: "420px",
        maxHeight: "550px",
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
          background: "#06b6d4",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            L
          </div>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
            Landing Page Preview
          </span>
        </div>
      </div>

      {hasPages ? (
        <>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "12px",
              flexShrink: 0,
            }}
          >
            {angles.map((angle) => {
              const isAvailable = availableAngles.includes(angle);
              const isActive = activeTab === angle;
              return (
                <button
                  key={angle}
                  onClick={() => isAvailable && setActiveTab(angle)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: "8px",
                    border: "none",
                    background: isActive ? angleColors[angle] : "#f5f5f7",
                    color: isActive ? "#fff" : isAvailable ? "#1d1d1f" : "#c5c5c5",
                    cursor: isAvailable ? "pointer" : "default",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    opacity: isAvailable ? 1 : 0.5,
                    transition: "all 0.15s",
                  }}
                >
                  {angle}
                </button>
              );
            })}
          </div>

          {/* Preview */}
          {currentPage && (
            <>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  borderRadius: "10px",
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  marginBottom: "12px",
                  minHeight: "250px",
                }}
              >
                <iframe
                  srcDoc={getPreviewHTML(currentPage)}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: "250px",
                    border: "none",
                  }}
                  title="Landing Page Preview"
                  sandbox="allow-same-origin"
                />
              </div>

              <button
                onClick={handleCopyHTML}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: copied
                    ? "#22c55e"
                    : "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                {copied ? "Copied!" : "Copy HTML"}
              </button>
            </>
          )}
        </>
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
            L
          </div>
          <div style={{ fontSize: "14px", fontWeight: 500 }}>
            Connect landing page data
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            Pages will preview here
          </div>
        </div>
      )}
    </div>
  );
}
