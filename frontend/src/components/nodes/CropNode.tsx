import { Handle, Position } from "@xyflow/react";
import { useState, useRef } from "react";

interface CropNodeProps {
  id: string;
  data: {
    imageUrl: string;
    videoUrl: string;
    outputUrl: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, imageUrl: string, prompt: string) => void;
  };
}

type AspectRatio = "4:5" | "1:1" | "16:9" | "9:16";

const ASPECT_RATIOS: Record<AspectRatio, { label: string; ratio: number }> = {
  "4:5": { label: "Portrait (4:5) - Meta Feeds", ratio: 4 / 5 },
  "1:1": { label: "Square (1:1)", ratio: 1 },
  "16:9": { label: "Landscape (16:9)", ratio: 16 / 9 },
  "9:16": { label: "Vertical (9:16) - Stories/Reels", ratio: 9 / 16 },
};

export default function CropNode({ id, data }: CropNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState(data.outputUrl || "");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Accept either image or video input
  const inputUrl = data.videoUrl || data.imageUrl || "";

  const detectMediaType = (url: string): boolean => {
    // Check if it's a video by extension or data URL type
    if (url.startsWith("data:video/")) return true;
    if (url.includes(".mp4") || url.includes(".webm") || url.includes(".mov")) return true;
    return false;
  };

  const cropImage = async (url: string, targetRatio: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        const srcWidth = img.width;
        const srcHeight = img.height;
        const srcRatio = srcWidth / srcHeight;

        let cropWidth: number;
        let cropHeight: number;
        let cropX: number;
        let cropY: number;

        if (srcRatio > targetRatio) {
          // Source is wider than target, crop sides
          cropHeight = srcHeight;
          cropWidth = srcHeight * targetRatio;
          cropX = (srcWidth - cropWidth) / 2;
          cropY = 0;
        } else {
          // Source is taller than target, crop top/bottom
          cropWidth = srcWidth;
          cropHeight = srcWidth / targetRatio;
          cropX = 0;
          cropY = (srcHeight - cropHeight) / 2;
        }

        // Output size (maintain reasonable resolution)
        const maxDimension = 1080;
        let outWidth: number;
        let outHeight: number;

        if (targetRatio >= 1) {
          outWidth = maxDimension;
          outHeight = maxDimension / targetRatio;
        } else {
          outHeight = maxDimension;
          outWidth = maxDimension * targetRatio;
        }

        canvas.width = outWidth;
        canvas.height = outHeight;

        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, outWidth, outHeight
        );

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  };

  const cropVideo = async (url: string, targetRatio: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        const srcWidth = video.videoWidth;
        const srcHeight = video.videoHeight;
        const srcRatio = srcWidth / srcHeight;

        let cropWidth: number;
        let cropHeight: number;
        let cropX: number;
        let cropY: number;

        if (srcRatio > targetRatio) {
          cropHeight = srcHeight;
          cropWidth = srcHeight * targetRatio;
          cropX = (srcWidth - cropWidth) / 2;
          cropY = 0;
        } else {
          cropWidth = srcWidth;
          cropHeight = srcWidth / targetRatio;
          cropX = 0;
          cropY = (srcHeight - cropHeight) / 2;
        }

        // Output size
        const maxDimension = 1080;
        let outWidth: number;
        let outHeight: number;

        if (targetRatio >= 1) {
          outWidth = maxDimension;
          outHeight = Math.round(maxDimension / targetRatio);
        } else {
          outHeight = maxDimension;
          outWidth = Math.round(maxDimension * targetRatio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Set up MediaRecorder
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 5000000,
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read video blob"));
          reader.readAsDataURL(blob);
        };

        mediaRecorder.onerror = () => reject(new Error("MediaRecorder error"));

        // Start recording
        mediaRecorder.start();
        video.currentTime = 0;

        await video.play();

        const drawFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(
            video,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, outWidth, outHeight
          );

          requestAnimationFrame(drawFrame);
        };

        drawFrame();

        video.onended = () => {
          mediaRecorder.stop();
        };
      };

      video.onerror = () => reject(new Error("Failed to load video"));
      video.src = url;
      video.load();
    });
  };

  const handleCrop = async () => {
    if (!inputUrl) {
      setError("Connect an image or video source first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const mediaIsVideo = detectMediaType(inputUrl);
      setIsVideo(mediaIsVideo);

      const targetRatio = ASPECT_RATIOS[aspectRatio].ratio;
      let result: string;

      if (mediaIsVideo) {
        result = await cropVideo(inputUrl, targetRatio);
      } else {
        result = await cropImage(inputUrl, targetRatio);
      }

      setOutputUrl(result);

      // Update node data based on media type
      if (mediaIsVideo) {
        data.updateNodeData?.(id, { videoUrl: result, outputUrl: result });
        data.propagateOutput?.(id, result, "cropped-video");
      } else {
        data.updateNodeData?.(id, { imageUrl: result, outputUrl: result });
        data.propagateOutput?.(id, result, "cropped-image");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crop failed");
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
          background: "#f59e0b",
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
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          C
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Crop
        </span>
      </div>

      {inputUrl && (
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
            {detectMediaType(inputUrl) ? (
              <video
                src={inputUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
            ) : (
              <img
                src={inputUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <span style={{ fontSize: "11px", color: "#86868b" }}>
            {detectMediaType(inputUrl) ? "Video ready" : "Image ready"}
          </span>
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <label
          style={{
            fontSize: "10px",
            color: "#86868b",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Aspect Ratio
        </label>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid #e5e5e5",
            fontSize: "11px",
            fontFamily: "inherit",
          }}
        >
          {Object.entries(ASPECT_RATIOS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCrop}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
        {loading ? "Cropping..." : "Crop"}
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
            padding: "8px",
            background: "#fffbeb",
            borderRadius: "8px",
          }}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={outputUrl}
              controls
              autoPlay
              loop
              muted
              style={{
                width: "100%",
                borderRadius: "6px",
              }}
            />
          ) : (
            <img
              src={outputUrl}
              alt="Cropped"
              style={{
                width: "100%",
                borderRadius: "6px",
              }}
            />
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#d97706",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
