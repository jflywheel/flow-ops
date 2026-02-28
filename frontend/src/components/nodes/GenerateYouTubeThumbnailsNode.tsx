import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { generateYouTubeThumbnails } from "../../api";

// Default reference image for AI Investor Podcast
const DEFAULT_REFERENCE_IMAGE = "https://images.squarespace-cdn.com/content/v1/6541285a93c82b51f7865bb8/4b02ff09-c388-4225-8186-9df1a277b936/IMG_0509.jpg";

interface Thumbnail {
  specific_topic: string;
  overlay_text: string;
  hook_angle: string;
  imageUrl: string;
}

interface GenerateYouTubeThumbnailsNodeProps {
  id: string;
  data: {
    inputValue?: string;
    thumbnails?: Thumbnail[];
    referenceImageUrl?: string;
    episodeTitle?: string;
    model?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

// Thumbnail card component for the modal
function ThumbnailCard({
  thumbnail,
  index,
}: {
  thumbnail: Thumbnail;
  index: number;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = thumbnail.imageUrl;
    link.download = `thumbnail-${index + 1}-${thumbnail.specific_topic.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  };

  return (
    <div
      style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
        border: "1px solid #e5e5e5",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#dc2626",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {thumbnail.specific_topic}
        </span>
        <span
          style={{
            fontSize: "10px",
            padding: "3px 8px",
            background: "#dbeafe",
            color: "#1e40af",
            borderRadius: "4px",
          }}
        >
          {thumbnail.hook_angle}
        </span>
      </div>

      {/* Thumbnail Image */}
      <div
        style={{
          position: "relative",
          marginBottom: "12px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <img
          src={thumbnail.imageUrl}
          alt={thumbnail.specific_topic}
          style={{
            width: "100%",
            display: "block",
            borderRadius: "8px",
          }}
        />
        <button
          onClick={handleDownload}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Download
        </button>
      </div>

      {/* Overlay Text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "#fff",
          borderRadius: "8px",
          border: "2px solid #dc2626",
        }}
      >
        <div>
          <div style={{ fontSize: "10px", color: "#86868b", marginBottom: "4px" }}>
            Overlay Text
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f" }}>
            {thumbnail.overlay_text}
          </div>
        </div>
        <button
          onClick={() => handleCopy(thumbnail.overlay_text, "overlay")}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: copiedField === "overlay" ? "#34c759" : "#dc2626",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {copiedField === "overlay" ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function GenerateYouTubeThumbnailsNode({
  id,
  data,
}: GenerateYouTubeThumbnailsNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>(data.thumbnails || []);
  const [done, setDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState(data.referenceImageUrl || DEFAULT_REFERENCE_IMAGE);
  const [episodeTitle, setEpisodeTitle] = useState(data.episodeTitle || "");
  const [model, setModel] = useState(data.model || "gemini-3.1-flash");

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
    setThumbnails([]);

    try {
      const result = await generateYouTubeThumbnails(
        inputText,
        referenceImageUrl || undefined,
        episodeTitle || undefined,
        model
      );

      setThumbnails(result.thumbnails);
      setDone(true);

      // Store result
      data.updateNodeData?.(id, {
        thumbnails: result.thumbnails,
        referenceImageUrl,
        episodeTitle,
        model,
      });

      // Propagate first image URL
      if (result.thumbnails.length > 0) {
        data.propagateData?.(id, result.thumbnails[0].imageUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Modal with thumbnail gallery
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
            width: "900px",
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
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "#1d1d1f",
              }}
            >
              YouTube Thumbnails ({thumbnails.length})
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

          {/* Content - 2 column grid */}
          <div
            style={{
              padding: "24px",
              overflow: "auto",
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
            }}
          >
            {thumbnails.map((thumbnail, i) => (
              <ThumbnailCard key={i} thumbnail={thumbnail} index={i} />
            ))}
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
          background: "#dc2626",
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
            background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          ▶
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          YT Thumbnails
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
          Transcript connected ({inputText.length.toLocaleString()} chars)
        </div>
      )}

      {/* Options toggle */}
      <div
        onClick={() => setShowOptions(!showOptions)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "11px",
          color: "#86868b",
          cursor: "pointer",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "10px" }}>{showOptions ? "▼" : "▶"}</span>
        <span>Options</span>
      </div>

      {showOptions && (
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={episodeTitle}
            onChange={(e) => setEpisodeTitle(e.target.value)}
            placeholder="Episode title (optional)"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              fontSize: "11px",
              marginBottom: "6px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <input
            type="text"
            value={referenceImageUrl}
            onChange={(e) => setReferenceImageUrl(e.target.value)}
            placeholder="Reference image URL (host photo)"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              fontSize: "11px",
              marginBottom: "6px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              fontSize: "11px",
              fontFamily: "inherit",
              boxSizing: "border-box",
              background: "#fff",
            }}
          >
            <option value="gemini-3.1-flash">Gemini 3.1 Flash (newest)</option>
            <option value="gemini-pro">Gemini 3 Pro</option>
            <option value="gemini-flash">Gemini 2.5 Flash</option>
          </select>
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
          background:
            loading || !hasInput
              ? "#e5e5e5"
              : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          color: loading || !hasInput ? "#86868b" : "#fff",
          cursor: loading ? "wait" : !hasInput ? "not-allowed" : "pointer",
          fontSize: "13px",
          fontWeight: 500,
          transition: "transform 0.1s",
        }}
        onMouseDown={(e) => {
          if (!loading && hasInput)
            e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {loading ? "Generating..." : "Generate Thumbnails"}
      </button>

      {loading && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "#86868b",
            textAlign: "center",
          }}
        >
          Generating 5 thumbnails... this may take a minute
        </div>
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

      {done && !loading && thumbnails.length > 0 && (
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: "10px",
            borderRadius: "8px",
            overflow: "hidden",
            cursor: "pointer",
            border: "1px solid #e5e5e5",
          }}
        >
          {/* Preview first thumbnail */}
          <img
            src={thumbnails[0].imageUrl}
            alt="Thumbnail preview"
            style={{
              width: "100%",
              display: "block",
            }}
          />
          <div
            style={{
              padding: "8px 10px",
              background: "#fef2f2",
              fontSize: "11px",
              color: "#b91c1c",
              textAlign: "center",
            }}
          >
            <strong>{thumbnails.length} thumbnails</strong> - Click to view all
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
          background: "#b91c1c",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
