import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { generatePhoto } from "../../api";

interface IPhonePhotoNodeProps {
  id: string;
  data: {
    inputValue: string;
    imageUrl: string;
    prompt: string;
    loading: boolean;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, imageUrl: string, prompt: string) => void;
  };
}

export default function IPhonePhotoNode({ id, data }: IPhonePhotoNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(data.imageUrl || "");
  const [done, setDone] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [format, setFormat] = useState<"square" | "landscape" | "portrait" | "vertical">("square");
  const [model, setModel] = useState<"gemini-flash" | "gemini-pro">("gemini-flash");

  const inputValue = data.inputValue || "";
  const inputImageUrl = data.imageUrl || "";

  const handleGenerate = async () => {
    if (!inputValue.trim() && !inputImageUrl) {
      setError("Connect a text or image input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      const result = await generatePhoto(inputValue, extraInstructions || undefined, inputImageUrl || undefined, format, model);
      setImageUrl(result.imageUrl);
      setDone(true);
      data.updateNodeData?.(id, { imageUrl: result.imageUrl, prompt: result.prompt });
      data.propagateOutput?.(id, result.imageUrl, result.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
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
          background: "#667eea",
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
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          P
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          iPhone Photo
        </span>
      </div>

      {inputImageUrl && (
        <div
          style={{
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: "#f5f5f7",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={inputImageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "#86868b" }}>Input image</span>
        </div>
      )}

      {inputValue && (
        <div
          style={{
            background: "#f5f5f7",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#86868b",
            marginBottom: "10px",
            lineHeight: "1.4",
            maxHeight: "40px",
            overflow: "hidden",
          }}
        >
          {inputValue.slice(0, 60)}
          {inputValue.length > 60 && "..."}
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
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "10px" }}>{showOptions ? "▼" : "▶"}</span>
        <span>Options</span>
      </div>

      {showOptions && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as "gemini-flash" | "gemini-pro")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="gemini-flash">Gemini 2.5 Flash (~$0.04)</option>
              <option value="gemini-pro">Gemini 3 Pro (~$0.24)</option>
            </select>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "square" | "landscape" | "portrait" | "vertical")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="square">Square (1:1)</option>
              <option value="landscape">Landscape (16:9)</option>
              <option value="portrait">Portrait (4:5) - Meta Feeds</option>
              <option value="vertical">Vertical (9:16) - Stories/Reels</option>
            </select>
          </div>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="Extra instructions..."
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              fontSize: "11px",
              resize: "none",
              minHeight: "50px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
        {loading ? "Generating..." : "Generate"}
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

      {done && imageUrl && !loading && (
        <div
          onClick={() => setShowLightbox(true)}
          style={{
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: "#f0fdf4",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#dcfce7";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f0fdf4";
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 500 }}>
            Click to view
          </span>
        </div>
      )}

      {/* Lightbox modal */}
      {showLightbox && imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <img
            src={imageUrl}
            alt="Generated photo"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: "12px",
              boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              color: "#fff",
              fontSize: "14px",
              opacity: 0.7,
            }}
          >
            Click anywhere to close
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#764ba2",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
