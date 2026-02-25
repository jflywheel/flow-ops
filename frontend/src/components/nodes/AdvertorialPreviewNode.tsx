import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

interface AdvertorialData {
  headline?: string;
  content?: string;
  html?: string;
}

interface AdvertorialPreviewNodeProps {
  data: {
    advertorial?: AdvertorialData;
    headline?: string;
    content?: string;
    inputValue?: string | AdvertorialData;
  };
}

export default function AdvertorialPreviewNode({ data }: AdvertorialPreviewNodeProps) {
  const [copied, setCopied] = useState(false);

  // Try to parse inputValue as advertorial if not directly provided
  let advertorial: AdvertorialData | undefined = data.advertorial;
  if (!advertorial && data.inputValue) {
    try {
      advertorial = typeof data.inputValue === "string"
        ? JSON.parse(data.inputValue)
        : data.inputValue;
    } catch {
      // Not valid JSON, ignore
    }
  }

  // Fallback to direct headline/content props
  if (!advertorial && (data.headline || data.content)) {
    advertorial = {
      headline: data.headline,
      content: data.content,
    };
  }

  const hasContent = advertorial && (advertorial.headline || advertorial.content || advertorial.html);

  const buildHTML = (ad: AdvertorialData): string => {
    if (ad.html) return ad.html;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ad.headline || "Advertorial"}</title>
  <style>
    body {
      font-family: Georgia, serif;
      line-height: 1.8;
      max-width: 680px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1d1d1f;
    }
    h1 {
      font-size: 32px;
      line-height: 1.3;
      margin-bottom: 24px;
    }
    p { margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>${ad.headline || ""}</h1>
  <article>${ad.content || ""}</article>
</body>
</html>`;
  };

  const getPreviewHTML = (ad: AdvertorialData): string => {
    if (ad.html) return ad.html;
    return `<div style="padding: 20px; font-family: Georgia, serif; line-height: 1.8;">
      <h1 style="font-size: 22px; line-height: 1.3; margin-bottom: 16px;">${ad.headline || ""}</h1>
      <article style="font-size: 14px;">${ad.content || ""}</article>
    </div>`;
  };

  const handleCopyHTML = async () => {
    if (!advertorial) return;

    const html = buildHTML(advertorial);
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        width: "400px",
        maxHeight: "520px",
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
          background: "#f97316",
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
            background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          A
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Advertorial Preview
        </span>
      </div>

      {hasContent && advertorial ? (
        <>
          {/* Preview */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              borderRadius: "10px",
              border: "1px solid #e5e5e5",
              background: "#fff",
              marginBottom: "12px",
              minHeight: "300px",
            }}
          >
            <iframe
              srcDoc={getPreviewHTML(advertorial)}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "300px",
                border: "none",
              }}
              title="Advertorial Preview"
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
                : "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
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
            A
          </div>
          <div style={{ fontSize: "14px", fontWeight: 500 }}>
            Connect advertorial data
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            {"{ headline, content }"}
          </div>
        </div>
      )}
    </div>
  );
}
