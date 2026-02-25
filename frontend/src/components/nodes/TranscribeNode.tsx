import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { transcribe } from "../../api";

interface TranscribeNodeProps {
  id: string;
  data: {
    // Input can be audioUrl or audioBase64 + mimeType
    audioUrl?: string;
    audioBase64?: string;
    mimeType?: string;
    // Output
    transcript?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, data: Record<string, unknown>) => void;
  };
}

export default function TranscribeNode({ id, data }: TranscribeNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState(data.transcript || "");

  const audioUrl = data.audioUrl || "";
  const audioBase64 = data.audioBase64 || "";
  const mimeType = data.mimeType || "";

  const hasInput = audioUrl || (audioBase64 && mimeType);

  const handleTranscribe = async () => {
    if (!hasInput) {
      setError("Connect an audio input first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await transcribe(
        audioUrl || undefined,
        audioBase64 || undefined,
        mimeType || undefined
      );
      setTranscript(result.transcript);
      data.updateNodeData?.(id, { transcript: result.transcript });
      data.propagateData?.(id, { transcript: result.transcript });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
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
          background: "#3b82f6",
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
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
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
          Transcribe
        </span>
      </div>

      {/* Input indicator */}
      {hasInput && (
        <div
          style={{
            background: "#f5f5f7",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#86868b",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "14px" }}>🎵</span>
          <span>
            {audioUrl ? "Audio URL connected" : "Audio data connected"}
          </span>
        </div>
      )}

      <button
        onClick={handleTranscribe}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
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
        {loading ? "Transcribing..." : "Transcribe"}
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

      {transcript && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#eff6ff",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#1e40af",
            lineHeight: "1.4",
            maxHeight: "60px",
            overflow: "hidden",
          }}
        >
          {transcript.slice(0, 100)}
          {transcript.length > 100 && "..."}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#1d4ed8",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
