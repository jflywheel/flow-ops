import { Handle, Position } from "@xyflow/react";
import { useState, useEffect } from "react";

type Angle = "fear" | "greed" | "curiosity" | "urgency";

interface AngleData {
  fear?: unknown;
  greed?: unknown;
  curiosity?: unknown;
  urgency?: unknown;
}

interface FilterByAngleNodeProps {
  id: string;
  data: {
    angles?: AngleData;
    inputValue?: string | AngleData;
    selectedAngle?: Angle;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, data: unknown, prompt: string) => void;
  };
}

const angles: Angle[] = ["fear", "greed", "curiosity", "urgency"];

const angleColors: Record<Angle, string> = {
  fear: "#ef4444",
  greed: "#22c55e",
  curiosity: "#3b82f6",
  urgency: "#f59e0b",
};

const angleGradients: Record<Angle, string> = {
  fear: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
  greed: "linear-gradient(135deg, #22c55e 0%, #4ade80 100%)",
  curiosity: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
  urgency: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
};

export default function FilterByAngleNode({ id, data }: FilterByAngleNodeProps) {
  const [selectedAngle, setSelectedAngle] = useState<Angle>(
    data.selectedAngle || "fear"
  );

  // Try to parse inputValue as angles object if not directly provided
  let anglesData = data.angles;
  if (!anglesData && data.inputValue) {
    try {
      anglesData = typeof data.inputValue === "string"
        ? JSON.parse(data.inputValue)
        : data.inputValue;
    } catch {
      // Not valid JSON, ignore
    }
  }

  const selectedData = anglesData?.[selectedAngle];

  // Get preview of selected data
  const getPreview = (value: unknown): string => {
    if (value === undefined || value === null) return "No data";
    if (typeof value === "string") {
      if (value.length > 50) return value.substring(0, 50) + "...";
      return value;
    }
    if (Array.isArray(value)) return `Array with ${value.length} items`;
    if (typeof value === "object") {
      const keys = Object.keys(value);
      return `Object with ${keys.length} keys`;
    }
    return String(value);
  };

  // Propagate selected angle data when selection changes
  useEffect(() => {
    if (data.updateNodeData) {
      data.updateNodeData(id, {
        selectedAngle,
        outputValue: selectedData,
        inputValue: typeof selectedData === "string"
          ? selectedData
          : JSON.stringify(selectedData),
      });
    }
    if (data.propagateOutput && selectedData !== undefined) {
      const output = typeof selectedData === "string"
        ? selectedData
        : JSON.stringify(selectedData);
      data.propagateOutput(id, output, selectedAngle);
    }
  }, [selectedAngle, selectedData, data, id]);

  const handleAngleChange = (angle: Angle) => {
    setSelectedAngle(angle);
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
          background: angleColors[selectedAngle],
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: angleGradients[selectedAngle],
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          F
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Filter by Angle
        </span>
      </div>

      {/* Angle selector */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            fontSize: "10px",
            color: "#86868b",
            display: "block",
            marginBottom: "6px",
          }}
        >
          Select Angle
        </label>
        <select
          value={selectedAngle}
          onChange={(e) => handleAngleChange(e.target.value as Angle)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #e5e5e5",
            fontSize: "13px",
            fontFamily: "inherit",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {angles.map((angle) => {
            const hasAngleData = anglesData?.[angle] !== undefined;
            return (
              <option key={angle} value={angle}>
                {angle.charAt(0).toUpperCase() + angle.slice(1)}
                {hasAngleData ? " *" : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* Angle availability indicators */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "12px",
        }}
      >
        {angles.map((angle) => {
          const hasAngleData = anglesData?.[angle] !== undefined;
          const isSelected = selectedAngle === angle;
          return (
            <button
              key={angle}
              onClick={() => handleAngleChange(angle)}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: "6px",
                border: isSelected ? `2px solid ${angleColors[angle]}` : "2px solid transparent",
                background: hasAngleData ? angleColors[angle] + "20" : "#f5f5f7",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: hasAngleData ? angleColors[angle] : "#d1d5db",
                  margin: "0 auto",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Preview of selected data */}
      <div
        style={{
          padding: "10px",
          background: selectedData !== undefined ? angleColors[selectedAngle] + "10" : "#f5f5f7",
          borderRadius: "8px",
          borderLeft: `3px solid ${selectedData !== undefined ? angleColors[selectedAngle] : "#d1d5db"}`,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#86868b",
            marginBottom: "4px",
            textTransform: "capitalize",
          }}
        >
          {selectedAngle} Data
        </div>
        <div
          style={{
            fontSize: "12px",
            color: selectedData !== undefined ? "#1d1d1f" : "#9ca3af",
            lineHeight: "1.4",
            wordBreak: "break-word",
          }}
        >
          {getPreview(selectedData)}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: selectedData !== undefined ? angleColors[selectedAngle] : "#d1d5db",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
