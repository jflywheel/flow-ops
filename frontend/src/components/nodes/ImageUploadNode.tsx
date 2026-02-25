import { Handle, Position } from "@xyflow/react";
import { useState, useRef } from "react";

interface ImageUploadNodeProps {
  id: string;
  data: {
    imageUrl: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, imageUrl: string, prompt: string) => void;
  };
}

export default function ImageUploadNode({ id, data }: ImageUploadNodeProps) {
  const [imageUrl, setImageUrl] = useState(data.imageUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
      data.updateNodeData?.(id, { imageUrl: dataUrl });
      // Don't pass filename as prompt - just pass empty string
      data.propagateOutput?.(id, dataUrl, "");
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        width: "200px",
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
            background: "#0071e3",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          I
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Image Upload
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {imageUrl ? (
        <div
          onClick={handleClick}
          style={{
            cursor: "pointer",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #e5e5e5",
          }}
        >
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
          <div
            style={{
              padding: "8px",
              background: "#f5f5f7",
              fontSize: "11px",
              color: "#86868b",
              textAlign: "center",
            }}
          >
            Click to change
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          style={{
            padding: "24px 16px",
            background: "#f5f5f7",
            borderRadius: "10px",
            textAlign: "center",
            cursor: "pointer",
            border: "2px dashed #d1d1d6",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#0071e3";
            e.currentTarget.style.background = "#f0f5ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#d1d1d6";
            e.currentTarget.style.background = "#f5f5f7";
          }}
        >
          <div
            style={{
              fontSize: "24px",
              marginBottom: "8px",
            }}
          >
            +
          </div>
          <div style={{ fontSize: "12px", color: "#86868b" }}>
            Click to upload image
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#0071e3",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
