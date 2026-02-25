import { Handle, Position } from "@xyflow/react";
import { useState, useRef } from "react";

interface VideoUploadNodeProps {
  id: string;
  data: {
    videoBase64?: string;
    mimeType?: string;
    filename?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

export default function VideoUploadNode({ id, data }: VideoUploadNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState(data.filename || "");
  const [fileSize, setFileSize] = useState("");
  const [duration, setDuration] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
      setError("Please select an MP4, MOV, or WebM file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get video duration
      const videoDuration = await getVideoDuration(file);
      setDuration(formatDuration(videoDuration));

      // Convert file to base64
      const base64 = await fileToBase64(file);
      const mimeType = file.type || getMimeType(file.name);

      setFilename(file.name);
      setFileSize(formatFileSize(file.size));

      const outputData = {
        videoBase64: base64,
        mimeType: mimeType,
        filename: file.name,
        duration: videoDuration,
      };

      data.updateNodeData?.(id, outputData);
      data.propagateData?.(id, outputData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setLoading(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        resolve(0); // Return 0 if we can't get duration
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:*/*;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
      case "mp4":
        return "video/mp4";
      case "mov":
        return "video/quicktime";
      case "webm":
        return "video/webm";
      default:
        return "video/mp4";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
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
            background: "#e74c3c",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          V
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Video Upload
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
        style={{ display: "none" }}
      />

      <button
        onClick={handleButtonClick}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading ? "#e5e5e5" : "#e74c3c",
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
        {loading ? "Processing..." : "Select Video File"}
      </button>

      <div
        style={{
          marginTop: "8px",
          fontSize: "10px",
          color: "#86868b",
          textAlign: "center",
        }}
      >
        MP4, MOV, or WebM
      </div>

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

      {filename && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#fef2f2",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#dc2626",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Uploaded:</div>
          {filename.length > 25 ? filename.slice(0, 25) + "..." : filename}
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#e74c3c" }}>
            {fileSize}
            {duration && ` | ${duration}`}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#e74c3c",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
