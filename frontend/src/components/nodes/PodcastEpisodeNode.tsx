import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { fetchPodcastEpisode } from "../../api";

interface PodcastEpisodeNodeProps {
  id: string;
  data: {
    audioUrl?: string;
    title?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

export default function PodcastEpisodeNode({ id, data }: PodcastEpisodeNodeProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState(data.title || "");
  const [audioUrl, setAudioUrl] = useState(data.audioUrl || "");

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Enter a podcast episode URL first");
      return;
    }

    // Basic URL validation
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    setLoading(true);
    setError("");

    try {
      const result = await fetchPodcastEpisode(finalUrl);
      setEpisodeTitle(result.title);
      setAudioUrl(result.audioUrl);

      const outputData = { audioUrl: result.audioUrl, title: result.title };
      data.updateNodeData?.(id, outputData);
      data.propagateData?.(id, outputData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch episode");
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
        width: "240px",
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
            background: "#9b59b6",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          P
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Podcast Episode
        </span>
      </div>

      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleFetch()}
        placeholder="Podcast episode URL..."
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid #e5e5e5",
          fontSize: "12px",
          marginBottom: "8px",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleFetch}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading ? "#e5e5e5" : "#9b59b6",
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
        {loading ? "Fetching..." : "Fetch Episode"}
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

      {episodeTitle && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#f5f0ff",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#7c3aed",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Episode:</div>
          {episodeTitle.length > 80 ? episodeTitle.slice(0, 80) + "..." : episodeTitle}
          {audioUrl && (
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#9b59b6" }}>
              Audio URL ready
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
          background: "#9b59b6",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
