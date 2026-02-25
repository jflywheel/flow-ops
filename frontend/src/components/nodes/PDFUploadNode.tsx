import { Handle, Position } from "@xyflow/react";
import { useState, useRef } from "react";

interface PDFUploadNodeProps {
  id: string;
  data: {
    pdfBase64?: string;
    filename?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

export default function PDFUploadNode({ id, data }: PDFUploadNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState(data.filename || "");
  const [fileSize, setFileSize] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      setFilename(file.name);
      setFileSize(formatFileSize(file.size));

      const outputData = {
        pdfBase64: base64,
        filename: file.name,
      };

      data.updateNodeData?.(id, outputData);
      data.propagateData?.(id, outputData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setLoading(false);
    }
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
            background: "#c0392b",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 600,
          }}
        >
          PDF
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          PDF Upload
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,application/pdf"
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
          background: loading ? "#e5e5e5" : "#c0392b",
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
        {loading ? "Processing..." : "Select PDF File"}
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

      {filename && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#fdf2f2",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#991b1b",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Uploaded:</div>
          {filename.length > 25 ? filename.slice(0, 25) + "..." : filename}
          {fileSize && (
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#c0392b" }}>
              {fileSize}
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#c0392b",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
