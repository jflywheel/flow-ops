import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { transcribe, setDebugContext } from "../../api";
import ContentModal from "../ContentModal";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [speakerLabels, setSpeakerLabels] = useState(true); // Speaker diarization on by default
  const [speakerIdentification, setSpeakerIdentification] = useState(true); // Speaker ID on by default
  const [speakerType, setSpeakerType] = useState<"name" | "role">("name");
  const [knownValues, setKnownValues] = useState(""); // Comma-separated names/roles

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
      // Parse known values from comma-separated string
      const knownValuesArray = knownValues
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      setDebugContext({ nodeId: id, nodeName: "Transcribe" });
      const result = await transcribe(
        audioUrl || undefined,
        audioBase64 || undefined,
        mimeType || undefined,
        speakerLabels,
        speakerIdentification && speakerLabels, // Only enable if diarization is also on
        speakerType,
        knownValuesArray.length > 0 ? knownValuesArray : undefined
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
          {/* Speaker diarization toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              color: "#1d1d1f",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={speakerLabels}
              onChange={(e) => setSpeakerLabels(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>Speaker diarization</span>
          </label>
          <div style={{ fontSize: "10px", color: "#86868b", marginTop: "4px", marginLeft: "20px" }}>
            Identify different speakers (Speaker A, B, etc.)
          </div>

          {/* Speaker identification toggle (only show if diarization is on) */}
          {speakerLabels && (
            <>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  color: "#1d1d1f",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                <input
                  type="checkbox"
                  checked={speakerIdentification}
                  onChange={(e) => setSpeakerIdentification(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <span>Speaker identification</span>
              </label>
              <div style={{ fontSize: "10px", color: "#86868b", marginTop: "4px", marginLeft: "20px" }}>
                Use real names instead of Speaker A/B (add-on)
              </div>

              {/* Speaker identification options */}
              {speakerIdentification && (
                <div style={{ marginLeft: "20px", marginTop: "8px" }}>
                  {/* Speaker type selector */}
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
                      Label type
                    </label>
                    <select
                      value={speakerType}
                      onChange={(e) => setSpeakerType(e.target.value as "name" | "role")}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e5e5e5",
                        fontSize: "11px",
                        background: "#fff",
                      }}
                    >
                      <option value="name">Names (e.g., John, Sarah)</option>
                      <option value="role">Roles (e.g., Host, Guest)</option>
                    </select>
                  </div>

                  {/* Known values input */}
                  <div>
                    <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
                      Known {speakerType === "name" ? "names" : "roles"} (optional)
                    </label>
                    <input
                      type="text"
                      value={knownValues}
                      onChange={(e) => setKnownValues(e.target.value)}
                      placeholder={speakerType === "name" ? "John, Sarah, Mike" : "Host, Guest, Caller"}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e5e5e5",
                        fontSize: "11px",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ fontSize: "9px", color: "#86868b", marginTop: "2px" }}>
                      Comma-separated. Helps accuracy.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
          onClick={() => setModalOpen(true)}
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
            cursor: "pointer",
          }}
          title="Click to expand"
        >
          {transcript.slice(0, 100)}
          {transcript.length > 100 && "..."}
          <div style={{ fontSize: "10px", color: "#3b82f6", marginTop: "4px" }}>
            Click to expand
          </div>
        </div>
      )}

      <ContentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Transcript"
        content={transcript}
      />

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
