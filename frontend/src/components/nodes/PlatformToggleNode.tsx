import { Handle, Position } from "@xyflow/react";
import { useState, useEffect } from "react";

type Platform = "google" | "meta";

interface PlatformToggleNodeProps {
  id: string;
  data: {
    platform?: Platform;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, data: unknown, prompt: string) => void;
  };
}

export default function PlatformToggleNode({ id, data }: PlatformToggleNodeProps) {
  const [platform, setPlatform] = useState<Platform>(data.platform || "google");

  // Propagate platform when it changes
  useEffect(() => {
    const output = { platform };

    if (data.updateNodeData) {
      data.updateNodeData(id, {
        platform,
        outputValue: JSON.stringify(output),
        inputValue: JSON.stringify(output),
      });
    }
    if (data.propagateOutput) {
      data.propagateOutput(id, JSON.stringify(output), platform);
    }
  }, [platform, data, id]);

  const handleToggle = () => {
    setPlatform((prev) => (prev === "google" ? "meta" : "google"));
  };

  const isGoogle = platform === "google";

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
            background: isGoogle
              ? "linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc04 75%, #ea4335 100%)"
              : "linear-gradient(135deg, #0668E1 0%, #0866FF 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
            transition: "background 0.3s",
          }}
        >
          P
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
          Platform
        </span>
      </div>

      {/* Toggle switch */}
      <div
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px",
          background: "#f5f5f7",
          borderRadius: "12px",
          cursor: "pointer",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "10px 8px",
            borderRadius: "10px",
            background: isGoogle ? "#fff" : "transparent",
            boxShadow: isGoogle ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
            textAlign: "center",
            transition: "all 0.2s",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: isGoogle ? "#1d1d1f" : "#86868b",
            }}
          >
            Google
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "10px 8px",
            borderRadius: "10px",
            background: !isGoogle ? "#fff" : "transparent",
            boxShadow: !isGoogle ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
            textAlign: "center",
            transition: "all 0.2s",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: !isGoogle ? "#1d1d1f" : "#86868b",
            }}
          >
            Meta
          </div>
        </div>
      </div>

      {/* Platform details */}
      <div
        style={{
          padding: "12px",
          background: isGoogle ? "#f0f9ff" : "#eff6ff",
          borderRadius: "10px",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          {isGoogle ? (
            // Google logo colors indicator
            <div style={{ display: "flex", gap: "2px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4285f4" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ea4335" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fbbc04" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34a853" }} />
            </div>
          ) : (
            // Meta blue indicator
            <div style={{ width: "24px", height: "6px", borderRadius: "3px", background: "#0866FF" }} />
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          {isGoogle ? "Google Ads, Search, Display" : "Facebook, Instagram, Threads"}
        </div>
      </div>

      {/* Output indicator */}
      <div
        style={{
          marginTop: "10px",
          fontSize: "10px",
          color: "#86868b",
          textAlign: "center",
        }}
      >
        Output: {"{ platform: \"" + platform + "\" }"}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: isGoogle ? "#4285f4" : "#0866FF",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          transition: "background 0.2s",
        }}
      />
    </div>
  );
}
