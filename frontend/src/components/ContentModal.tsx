import { useState } from "react";
import { createPortal } from "react-dom";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string | object;
}

export default function ContentModal({ isOpen, onClose, title, content }: ContentModalProps) {
  const [copied, setCopied] = useState(false);

  // Format content for display - always pretty print objects
  const getDisplayContent = () => {
    if (typeof content === "object") {
      return JSON.stringify(content, null, 2);
    }
    // Try to pretty print JSON strings
    try {
      const parsed = JSON.parse(content as string);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content as string;
    }
  };

  if (!isOpen) return null;

  const displayContent = getDisplayContent();

  // Check if content is JSON/object (for styling)
  const isStructured = typeof content === "object" || (typeof content === "string" && (content.trim().startsWith("{") || content.trim().startsWith("[")));

  // Check if content might be HTML
  const mightBeHtml = typeof content === "string" && content.includes("<") && content.includes(">");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "95vw",
          height: "95vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid #e5e5e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#1d1d1f" }}>{title}</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Copy button */}
            <button
              onClick={handleCopy}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: copied ? "#34c759" : "#0071e3",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {copied ? (
                <>
                  <span>✓</span> Copied
                </>
              ) : (
                <>
                  <span style={{ fontSize: "16px" }}>⧉</span> Copy
                </>
              )}
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                border: "none",
                background: "#f5f5f7",
                color: "#86868b",
                fontSize: "20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e5e5e5";
                e.currentTarget.style.color = "#1d1d1f";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
                e.currentTarget.style.color = "#86868b";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "32px",
            overflow: "auto",
            flex: 1,
            background: "#fff",
          }}
        >
          {mightBeHtml ? (
            <div
              style={{
                fontSize: "16px",
                lineHeight: "1.8",
                color: "#1d1d1f",
              }}
            >
              <style>
                {`
                  .html-content h1 { font-size: 28px; font-weight: 700; margin: 0 0 24px 0; color: #1d1d1f; }
                  .html-content h2 { font-size: 22px; font-weight: 600; margin: 32px 0 16px 0; color: #1d1d1f; }
                  .html-content h3 { font-size: 18px; font-weight: 600; margin: 24px 0 12px 0; color: #1d1d1f; }
                  .html-content p { margin: 0 0 16px 0; }
                  .html-content ul, .html-content ol { margin: 0 0 16px 0; padding-left: 24px; }
                  .html-content li { margin: 8px 0; }
                  .html-content strong { font-weight: 600; }
                  .html-content blockquote {
                    margin: 16px 0;
                    padding: 16px 24px;
                    background: #f5f5f7;
                    border-left: 4px solid #0071e3;
                    border-radius: 0 8px 8px 0;
                  }
                `}
              </style>
              <div
                className="html-content"
                dangerouslySetInnerHTML={{ __html: content as string }}
              />
            </div>
          ) : isStructured ? (
            <pre
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "'SF Mono', 'Monaco', 'Menlo', monospace",
                color: "#1d1d1f",
                background: "#f5f5f7",
                padding: "20px",
                borderRadius: "12px",
              }}
            >
              <code>{displayContent}</code>
            </pre>
          ) : (
            <pre
              style={{
                margin: 0,
                fontSize: "16px",
                lineHeight: "1.8",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#1d1d1f",
              }}
            >
              {displayContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level, escaping any parent constraints
  return createPortal(modalContent, document.body);
}
