import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { animateImage, setDebugContext } from "../../api";

interface AnimateNodeProps {
  id: string;
  data: {
    imageUrl: string;
    inputValue: string;
    videoUrl: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, imageUrl: string, prompt: string) => void;
  };
}

export default function AnimateNode({ id, data }: AnimateNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState(data.videoUrl || "");
  const [showOptions, setShowOptions] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [duration, setDuration] = useState<5 | 6 | 7 | 8>(8);
  const [model, setModel] = useState<"veo-2" | "veo-3.1-fast" | "veo-3.1">("veo-2");

  // Can receive imageUrl directly or from inputValue (when chained from text operations)
  const imageUrl = data.imageUrl || "";

  const handleAnimate = async () => {
    if (!imageUrl) {
      setError("Connect an image source first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const prompt = extraInstructions || "Animate with natural, subtle motion";
      setDebugContext({ nodeId: id, nodeName: "Animate" });
      const result = await animateImage(imageUrl, prompt, aspectRatio, duration, model);
      setVideoUrl(result);
      data.updateNodeData?.(id, { videoUrl: result });
      // Propagate video URL to next node
      data.propagateOutput?.(id, result, "animated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Animation failed");
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
          background: "#06b6d4",
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
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          A
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Animate
        </span>
      </div>

      {imageUrl && (
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
              src={imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "#86868b" }}>Image ready</span>
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
              onChange={(e) => setModel(e.target.value as "veo-2" | "veo-3.1-fast" | "veo-3.1")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="veo-2">Veo 2.0 (~$0.05/sec)</option>
              <option value="veo-3.1-fast">Veo 3.1 Fast (~$0.50/sec)</option>
              <option value="veo-3.1">Veo 3.1 Standard (~$0.50/sec + audio)</option>
            </select>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Format
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as "16:9" | "9:16")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="16:9">Landscape (16:9)</option>
              <option value="9:16">Vertical (9:16) - Stories/Reels</option>
            </select>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as 5 | 6 | 7 | 8)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value={5}>5 seconds</option>
              <option value={6}>6 seconds</option>
              <option value={7}>7 seconds</option>
              <option value={8}>8 seconds</option>
            </select>
          </div>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="Animation style (e.g., slow zoom, gentle sway)..."
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
        onClick={handleAnimate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
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
        {loading ? "Animating..." : "Animate"}
      </button>

      {loading && (
        <div
          style={{
            fontSize: "10px",
            color: "#86868b",
            marginTop: "6px",
            textAlign: "center",
          }}
        >
          This may take a few minutes...
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

      {videoUrl && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px",
            background: "#f0f9ff",
            borderRadius: "8px",
          }}
        >
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            style={{
              width: "100%",
              borderRadius: "6px",
            }}
          />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#3b82f6",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
