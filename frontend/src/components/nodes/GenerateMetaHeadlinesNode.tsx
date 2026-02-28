import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { generateMetaHeadlines, setDebugContext } from "../../api";

interface GenerateMetaHeadlinesNodeProps {
  id: string;
  data: {
    inputValue?: string;
    primaryTexts?: string[];
    headlines?: string[];
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

// Copyable item component
function CopyableItem({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        padding: "12px 16px",
        background: "#f9fafb",
        borderRadius: "10px",
        marginBottom: "8px",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#86868b", marginBottom: "4px" }}>
          {label} ({text.length} chars)
        </div>
        <div style={{ fontSize: "14px", color: "#1d1d1f", lineHeight: "1.5" }}>
          {text}
        </div>
      </div>
      <button
        onClick={handleCopy}
        style={{
          padding: "6px 12px",
          borderRadius: "6px",
          border: "none",
          background: copied ? "#34c759" : "#8b5cf6",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.2s",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function GenerateMetaHeadlinesNode({ id, data }: GenerateMetaHeadlinesNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [primaryTexts, setPrimaryTexts] = useState<string[]>(data.primaryTexts || []);
  const [headlines, setHeadlines] = useState<string[]>(data.headlines || []);
  const [done, setDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Extract text from various input formats
  const getInputText = (): string | null => {
    if (!data.inputValue) return null;

    try {
      const parsed = JSON.parse(data.inputValue);

      // Handle report object
      if (parsed.executiveSummary || parsed.sections) {
        const parts: string[] = [];
        if (parsed.executiveSummary) parts.push(parsed.executiveSummary);
        if (parsed.sections) {
          for (const section of parsed.sections) {
            if (section.title) parts.push(section.title);
            if (section.hook) parts.push(section.hook);
            if (section.content) parts.push(section.content);
          }
        }
        return parts.join("\n\n");
      }

      // Handle advertorial { headline, content }
      if (parsed.headline && parsed.content) {
        return `${parsed.headline}\n\n${parsed.content}`;
      }

      // Handle { content } only
      if (parsed.content) {
        return parsed.content;
      }

      // Return stringified JSON as fallback
      return JSON.stringify(parsed);
    } catch {
      // Not JSON, use as plain text
      return data.inputValue;
    }
  };

  const inputText = getInputText();
  const hasInput = !!inputText;

  const handleGenerate = async () => {
    if (!inputText) {
      setError("Connect a text input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      setDebugContext({ nodeId: id, nodeName: "Meta Headlines" });
      const result = await generateMetaHeadlines(inputText);

      setPrimaryTexts(result.primaryTexts);
      setHeadlines(result.headlines);
      setDone(true);

      // Store result
      data.updateNodeData?.(id, {
        primaryTexts: result.primaryTexts,
        headlines: result.headlines,
      });

      // Propagate as JSON
      data.propagateData?.(id, JSON.stringify({
        primaryTexts: result.primaryTexts,
        headlines: result.headlines,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Custom modal with copy buttons
  const renderModal = () => {
    if (!modalOpen) return null;

    return createPortal(
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
        onClick={() => setModalOpen(false)}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            width: "700px",
            maxWidth: "95vw",
            maxHeight: "90vh",
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
              padding: "20px 24px",
              borderBottom: "1px solid #e5e5e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#fafafa",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1d1d1f" }}>
              Meta Ad Copy
            </h2>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "none",
                background: "#f5f5f7",
                color: "#86868b",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: "24px", overflow: "auto", flex: 1 }}>
            {/* Primary Texts */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#8b5cf6",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Primary Text (max 125 chars)
              </h3>
              {primaryTexts.map((text, i) => (
                <CopyableItem key={i} text={text} label={`Option ${i + 1}`} />
              ))}
            </div>

            {/* Headlines */}
            <div>
              <h3 style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#7c3aed",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Headlines (max 255 chars)
              </h3>
              {headlines.map((text, i) => (
                <CopyableItem key={i} text={text} label={`Option ${i + 1}`} />
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
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
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          M
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Meta Headlines
        </span>
      </div>

      {/* Input indicator */}
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
          }}
        >
          Text connected ({inputText.length.toLocaleString()} chars)
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
            : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
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
        {loading ? "Generating..." : "Generate Headlines"}
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

      {done && !loading && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#f5f3ff",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#7c3aed",
            lineHeight: "1.4",
            cursor: "pointer",
          }}
        >
          <strong>{primaryTexts.length} primary texts</strong>
          <br />
          <strong>{headlines.length} headlines</strong>
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#8b5cf6" }}>
            Click to copy
          </div>
        </div>
      )}

      {renderModal()}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#7c3aed",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
