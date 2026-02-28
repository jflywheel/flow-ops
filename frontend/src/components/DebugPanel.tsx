import { useState, useEffect, useCallback } from "react";
import {
  getEntries,
  clearEntries,
  subscribe,
  type DebugEntry,
} from "../debugLog";

// Format a timestamp as relative time (e.g. "2s ago", "5m ago")
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// Format duration nicely
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Simple JSON syntax highlighter (no external library)
function highlightJson(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // String values
    .replace(
      /"([^"\\]*(\\.[^"\\]*)*)"/g,
      (match) => {
        return `<span class="dbg-string">${match}</span>`;
      }
    )
    // Numbers
    .replace(
      /\b(-?\d+\.?\d*)\b/g,
      '<span class="dbg-number">$1</span>'
    )
    // Booleans and null
    .replace(
      /\b(true|false|null)\b/g,
      '<span class="dbg-keyword">$1</span>'
    );
}

// Collapsible JSON display with character count for long strings
function JsonBlock({
  data,
  label,
  maxCollapsedChars = 500,
}: {
  data: unknown;
  label: string;
  maxCollapsedChars?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  let jsonStr: string;
  try {
    jsonStr =
      typeof data === "string" ? data : JSON.stringify(data, null, 2) || "null";
  } catch {
    jsonStr = String(data);
  }

  const isLong = jsonStr.length > maxCollapsedChars;
  const displayStr = !expanded && isLong ? jsonStr.slice(0, 200) + "..." : jsonStr;
  const lineCount = jsonStr.split("\n").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = jsonStr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#86868b" }}>
          {label}
        </span>
        {isLong && (
          <span style={{ fontSize: 10, color: "#aaa" }}>
            ({jsonStr.length.toLocaleString()} chars, {lineCount} lines)
          </span>
        )}
        <button
          onClick={handleCopy}
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            fontSize: 10,
            borderRadius: 4,
            border: "1px solid #e5e5e5",
            background: copied ? "#e8f5e9" : "#fff",
            color: copied ? "#2e7d32" : "#666",
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: 10,
          borderRadius: 6,
          fontSize: 11,
          lineHeight: 1.5,
          overflowX: "auto",
          maxHeight: expanded ? 500 : 160,
          overflowY: "auto",
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: highlightJson(displayStr) }}
      />
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 4,
            padding: "2px 8px",
            fontSize: 10,
            borderRadius: 4,
            border: "1px solid #e5e5e5",
            background: "#f5f5f7",
            color: "#0071e3",
            cursor: "pointer",
          }}
        >
          {expanded ? "Show less" : `Show all (${jsonStr.length.toLocaleString()} chars)`}
        </button>
      )}
    </div>
  );
}

// Single debug entry row (collapsed and expanded states)
function DebugEntryRow({ entry }: { entry: DebugEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [errorCopied, setErrorCopied] = useState(false);
  const [timeStr, setTimeStr] = useState(relativeTime(entry.timestamp));

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStr(relativeTime(entry.timestamp));
    }, 10_000);
    return () => clearInterval(interval);
  }, [entry.timestamp]);

  const isError = entry.statusCode >= 400;
  const statusColor = isError ? "#ef4444" : "#22c55e";

  // Strip the API base to show just the path
  const pathDisplay = entry.endpoint.replace(
    /^https?:\/\/[^/]+/,
    ""
  );

  // Build a curl command for copying
  const buildCurl = (): string => {
    let curl = `curl -X ${entry.method} '${entry.endpoint}'`;
    curl += ` \\\n  -H 'Content-Type: application/json'`;
    curl += ` \\\n  -H 'Authorization: Bearer [TOKEN]'`;
    if (entry.requestBody) {
      const bodyStr =
        typeof entry.requestBody === "string"
          ? entry.requestBody
          : JSON.stringify(entry.requestBody);
      // Truncate very large bodies (like base64 images)
      const truncatedBody =
        bodyStr.length > 2000
          ? bodyStr.slice(0, 2000) + "...[truncated]"
          : bodyStr;
      curl += ` \\\n  -d '${truncatedBody.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(buildCurl());
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleCopyError = async () => {
    if (!entry.error) return;
    try {
      await navigator.clipboard.writeText(entry.error);
      setErrorCopied(true);
      setTimeout(() => setErrorCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        borderBottom: "1px solid #e5e5e5",
        borderLeft: isError ? "3px solid #ef4444" : "3px solid transparent",
        background: isError ? "#fef2f2" : "#fff",
      }}
    >
      {/* Collapsed row: clickable header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isError ? "#fee2e2" : "#f5f5f7";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isError ? "#fef2f2" : "#fff";
        }}
      >
        {/* Expand arrow */}
        <span
          style={{
            fontSize: 10,
            color: "#86868b",
            transition: "transform 0.15s",
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            display: "inline-block",
            flexShrink: 0,
          }}
        >
          {"\u25B6"}
        </span>

        {/* Timestamp */}
        <span
          style={{
            fontSize: 11,
            color: "#86868b",
            minWidth: 50,
            flexShrink: 0,
          }}
        >
          {timeStr}
        </span>

        {/* Endpoint */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#1d1d1f",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={pathDisplay}
        >
          {pathDisplay}
        </span>

        {/* Status badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#fff",
            background: statusColor,
            padding: "1px 6px",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {entry.statusCode}
        </span>

        {/* Duration */}
        <span
          style={{ fontSize: 11, color: "#86868b", minWidth: 45, textAlign: "right", flexShrink: 0 }}
        >
          {formatDuration(entry.duration)}
        </span>
      </div>

      {/* Model + node info line (always visible) */}
      {(entry.model || entry.nodeName) && (
        <div
          style={{
            padding: "0 12px 6px 30px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {entry.model && (
            <span
              style={{
                fontSize: 10,
                color: "#6366f1",
                background: "#eef2ff",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {entry.model}
            </span>
          )}
          {entry.nodeName && (
            <span
              style={{
                fontSize: 10,
                color: "#0d9488",
                background: "#f0fdfa",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {entry.nodeName}
            </span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            padding: "8px 12px 12px 30px",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          {/* Full URL */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#86868b" }}>
              URL
            </span>
            <div
              style={{
                fontSize: 11,
                color: "#1d1d1f",
                wordBreak: "break-all",
                marginTop: 2,
              }}
            >
              {entry.endpoint}
            </div>
          </div>

          {/* Error message (prominent if present) */}
          {entry.error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#dc2626",
                  }}
                >
                  Error
                </span>
                <button
                  onClick={handleCopyError}
                  style={{
                    padding: "2px 8px",
                    fontSize: 10,
                    borderRadius: 4,
                    border: "1px solid #fecaca",
                    background: errorCopied ? "#dcfce7" : "#fff",
                    color: errorCopied ? "#16a34a" : "#dc2626",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {errorCopied ? "Copied" : "Copy Error"}
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#991b1b", wordBreak: "break-word" }}>
                {entry.error}
              </div>
            </div>
          )}

          {/* Request body */}
          {entry.requestBody !== undefined && entry.requestBody !== null && (
            <JsonBlock data={entry.requestBody} label="Request Body" />
          )}

          {/* Response body */}
          {entry.responseBody !== undefined && entry.responseBody !== null && (
            <JsonBlock data={entry.responseBody} label="Response Body" />
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={handleCopyCurl}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid #e5e5e5",
                background: curlCopied ? "#e8f5e9" : "#f5f5f7",
                color: curlCopied ? "#2e7d32" : "#1d1d1f",
                cursor: "pointer",
              }}
            >
              {curlCopied ? "Copied" : "Copy as cURL"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles injected once into the document for JSON syntax highlighting
const debugStyles = `
  .dbg-string { color: #ce9178; }
  .dbg-number { color: #b5cea8; }
  .dbg-keyword { color: #569cd6; }
`;

// The main debug panel component
export default function DebugPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  // Subscribe to debug log changes
  useEffect(() => {
    // Initial load
    setEntries(getEntries());

    // Listen for new entries
    const unsubscribe = subscribe(() => {
      setEntries(getEntries());
    });

    return unsubscribe;
  }, []);

  const handleClear = useCallback(() => {
    clearEntries();
  }, []);

  return (
    <>
      <style>{debugStyles}</style>
      {/* Backdrop (click to close) */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.15)",
            zIndex: 999,
            transition: "opacity 0.2s",
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: "90vw",
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          // Don't render content when closed to save perf
          visibility: isOpen ? "visible" : "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid #e5e5e5",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.2px",
            }}
          >
            Debug Log
          </h2>

          {/* Count badge */}
          {entries.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                background: "#6366f1",
                padding: "1px 7px",
                borderRadius: 10,
              }}
            >
              {entries.length}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Clear button */}
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #e5e5e5",
                background: "#fff",
                color: "#86868b",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
                e.currentTarget.style.color = "#86868b";
              }}
            >
              Clear
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid #e5e5e5",
              background: "#fff",
              color: "#86868b",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
            title="Close debug panel"
          >
            x
          </button>
        </div>

        {/* Entry list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {entries.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "#86868b",
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>
                {"\u{1F50D}"}
              </div>
              No API calls recorded yet.
              <br />
              Run a node to see requests here.
            </div>
          ) : (
            entries.map((entry) => (
              <DebugEntryRow key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
