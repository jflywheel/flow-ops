import { Handle, Position } from "@xyflow/react";
import { useState, useRef } from "react";

interface TextOverlayNodeProps {
  id: string;
  data: {
    imageUrl: string;
    inputValue: string;
    outputUrl: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, imageUrl: string, prompt: string) => void;
  };
}

// Detect if URL is video or image
function isVideo(url: string): boolean {
  if (!url) return false;
  return url.startsWith("data:video/") ||
         url.includes("/video") ||
         url.endsWith(".mp4") ||
         url.endsWith(".webm");
}

export default function TextOverlayNode({ id, data }: TextOverlayNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState(data.outputUrl || "");
  const [overlayText, setOverlayText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [position, setPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("large");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaUrl = data.imageUrl || "";
  const isVideoMedia = isVideo(mediaUrl);

  // Client-side image text overlay using Canvas
  const overlayTextOnImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Configure text style
        const fontSizes = { small: 32, medium: 48, large: 64 };
        const size = Math.round((fontSizes[fontSize] / 1024) * img.width);
        ctx.font = `bold ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = size / 12;

        // Calculate position with generous padding
        const padding = size * 1.5; // More padding from edges
        let y: number;
        if (position === "top") {
          y = padding + size;
        } else if (position === "center") {
          y = canvas.height / 2;
        } else {
          y = canvas.height - padding - size * 0.5;
        }

        // Word wrap
        const maxWidth = canvas.width - padding * 2;
        const words = overlayText.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        // Draw each line
        const lineHeight = size * 1.2;
        const totalHeight = lines.length * lineHeight;
        let startY = y - (totalHeight / 2) + (lineHeight / 2);

        for (const line of lines) {
          // Stroke (outline)
          ctx.strokeText(line, canvas.width / 2, startY);
          // Fill
          ctx.fillText(line, canvas.width / 2, startY);
          startY += lineHeight;
        }

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = mediaUrl;
    });
  };

  // Client-side video text overlay using Canvas + MediaRecorder
  const overlayTextOnVideo = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        // Set up MediaRecorder
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(blob);
        };

        // Configure text
        const fontSizes = { small: 32, medium: 48, large: 64 };
        const size = Math.round((fontSizes[fontSize] / 1024) * canvas.width);

        // Start recording
        recorder.start();
        video.currentTime = 0;
        await video.play();

        // Render loop
        const drawFrame = () => {
          if (video.ended || video.paused) {
            recorder.stop();
            return;
          }

          // Draw video frame
          ctx.drawImage(video, 0, 0);

          // Draw text overlay
          ctx.font = `bold ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = size / 12;

          const padding = size * 1.5; // More padding from edges
          let y: number;
          if (position === "top") {
            y = padding + size;
          } else if (position === "center") {
            y = canvas.height / 2;
          } else {
            y = canvas.height - padding - size * 0.5;
          }

          // Word wrap
          const maxWidth = canvas.width - padding * 2;
          const words = overlayText.split(" ");
          const lines: string[] = [];
          let currentLine = "";

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          const lineHeight = size * 1.2;
          const totalHeight = lines.length * lineHeight;
          let startY = y - (totalHeight / 2) + (lineHeight / 2);

          for (const line of lines) {
            ctx.strokeText(line, canvas.width / 2, startY);
            ctx.fillText(line, canvas.width / 2, startY);
            startY += lineHeight;
          }

          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      };

      video.onerror = () => reject(new Error("Failed to load video"));
      video.src = mediaUrl;
    });
  };

  const handleOverlay = async () => {
    if (!mediaUrl) {
      setError("Connect an image or video source first");
      return;
    }
    if (!overlayText.trim()) {
      setError("Enter text to overlay");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = isVideoMedia
        ? await overlayTextOnVideo()
        : await overlayTextOnImage();

      setOutputUrl(result);
      data.updateNodeData?.(id, { outputUrl: result });
      data.propagateOutput?.(id, result, overlayText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Overlay failed");
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
          background: "#ec4899",
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
            background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          T
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Text Overlay
        </span>
      </div>

      {mediaUrl && (
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
              background: "#e5e5e5",
            }}
          >
            {isVideoMedia ? (
              <video
                src={mediaUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <span style={{ fontSize: "11px", color: "#86868b" }}>
            {isVideoMedia ? "Video" : "Image"} ready
          </span>
        </div>
      )}

      <input
        type="text"
        value={overlayText}
        onChange={(e) => setOverlayText(e.target.value)}
        placeholder="Text to add..."
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #e5e5e5",
          fontSize: "12px",
          marginBottom: "10px",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />

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
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as "top" | "center" | "bottom")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as "small" | "medium" | "large")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      )}

      <button
        onClick={handleOverlay}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
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
        {loading ? (isVideoMedia ? "Processing video..." : "Adding...") : "Add Text"}
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

      {outputUrl && !loading && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: "#fdf2f8",
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
            {isVideo(outputUrl) ? (
              <video
                src={outputUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
            ) : (
              <img
                src={outputUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <span style={{ fontSize: "11px", color: "#db2777", fontWeight: 500 }}>
            Done
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#f97316",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      {/* Hidden elements for processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <video ref={videoRef} style={{ display: "none" }} />
    </div>
  );
}
