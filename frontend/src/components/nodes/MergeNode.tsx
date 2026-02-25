import { Handle, Position } from "@xyflow/react";
import { useEffect, useMemo } from "react";

interface MergeNodeProps {
  id: string;
  data: {
    input_1?: unknown;
    input_2?: unknown;
    input_3?: unknown;
    input_4?: unknown;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, data: unknown, prompt: string) => void;
  };
}

const INPUT_HANDLES = [
  { id: "input_1", label: "1" },
  { id: "input_2", label: "2" },
  { id: "input_3", label: "3" },
  { id: "input_4", label: "4" },
];

export default function MergeNode({ id, data }: MergeNodeProps) {
  // Collect all non-null inputs into an array
  const mergedArray = useMemo(() => {
    const result: unknown[] = [];
    INPUT_HANDLES.forEach(({ id: handleId }) => {
      const value = data[handleId as keyof typeof data];
      if (value !== undefined && value !== null && value !== "") {
        result.push(value);
      }
    });
    return result;
  }, [data]);

  const inputCount = mergedArray.length;

  // Update node data when inputs change
  useEffect(() => {
    if (data.updateNodeData) {
      data.updateNodeData(id, {
        mergedArray,
        outputValue: JSON.stringify(mergedArray),
      });
    }
    if (data.propagateOutput && mergedArray.length > 0) {
      data.propagateOutput(id, JSON.stringify(mergedArray), "merged");
    }
  }, [mergedArray, data, id]);

  // Get preview of what type of data is in each input
  const getInputPreview = (value: unknown): string => {
    if (value === undefined || value === null || value === "") return "Empty";
    if (typeof value === "string") {
      if (value.startsWith("http") || value.startsWith("data:image")) return "Image";
      if (value.startsWith("{") || value.startsWith("[")) return "JSON";
      return "Text";
    }
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === "object") return "Object";
    return typeof value;
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        width: "180px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e5e5e5",
      }}
    >
      {/* Input handles on left */}
      {INPUT_HANDLES.map(({ id: handleId }, index) => {
        const value = data[handleId as keyof typeof data];
        const hasValue = value !== undefined && value !== null && value !== "";
        const topOffset = 70 + index * 36; // Adjusted for handle spacing

        return (
          <Handle
            key={handleId}
            type="target"
            position={Position.Left}
            id={handleId}
            style={{
              width: "12px",
              height: "12px",
              background: hasValue ? "#10b981" : "#d1d5db",
              border: "2px solid #fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              top: `${topOffset}px`,
            }}
          />
        );
      })}

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
            background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          M
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Merge
        </span>
      </div>

      {/* Input status indicators */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginBottom: "12px",
        }}
      >
        {INPUT_HANDLES.map(({ id: handleId, label }) => {
          const value = data[handleId as keyof typeof data];
          const hasValue = value !== undefined && value !== null && value !== "";
          const preview = getInputPreview(value);

          return (
            <div
              key={handleId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                background: hasValue ? "#ecfdf5" : "#f5f5f7",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  background: hasValue ? "#10b981" : "#d1d5db",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              <span style={{ color: hasValue ? "#059669" : "#9ca3af" }}>
                {preview}
              </span>
            </div>
          );
        })}
      </div>

      {/* Output preview */}
      <div
        style={{
          padding: "10px",
          background: inputCount > 0 ? "#f0fdf4" : "#f5f5f7",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "10px", color: "#86868b", marginBottom: "4px" }}>
          Output Array
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: inputCount > 0 ? "#10b981" : "#d1d5db",
          }}
        >
          [{inputCount}]
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: inputCount > 0 ? "#10b981" : "#d1d5db",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
