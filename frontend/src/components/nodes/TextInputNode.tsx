import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

interface TextInputNodeProps {
  id: string;
  data: {
    value: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: string) => void;
  };
}

export default function TextInputNode({ id, data }: TextInputNodeProps) {
  const [value, setValue] = useState(data.value || "");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    data.updateNodeData?.(id, { value: newValue });
    data.propagateData?.(id, newValue);
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
            background: "#0071e3",
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
          Text Input
        </span>
      </div>

      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Describe what you want..."
        style={{
          width: "100%",
          minHeight: "70px",
          padding: "10px",
          borderRadius: "10px",
          border: "1px solid #e5e5e5",
          background: "#fafafa",
          color: "#1d1d1f",
          resize: "vertical",
          fontFamily: "inherit",
          fontSize: "13px",
          lineHeight: "1.5",
          outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#0071e3";
          e.target.style.boxShadow = "0 0 0 3px rgba(0,113,227,0.1)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#e5e5e5";
          e.target.style.boxShadow = "none";
        }}
      />

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
