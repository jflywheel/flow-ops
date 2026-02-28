import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { fetchPodcastRSS } from "../../api";

interface Episode {
  title: string;
  audioUrl: string;
  pubDate?: string;
}

interface PodcastRSSNodeProps {
  id: string;
  data: {
    audioUrl?: string;
    title?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

// Preset podcast feeds
const PRESET_FEEDS = [
  { name: "AI Investor Podcast", url: "https://rss.buzzsprout.com/2400102.rss" },
  { name: "Custom URL", url: "" },
];

export default function PodcastRSSNode({ id, data }: PodcastRSSNodeProps) {
  const [selectedPreset, setSelectedPreset] = useState(0); // Default to AI Investor
  const [feedUrl, setFeedUrl] = useState(PRESET_FEEDS[0].url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedTitle, setFeedTitle] = useState("");

  const handleLoadFeed = async () => {
    if (!feedUrl.trim()) {
      setError("Enter an RSS feed URL first");
      return;
    }

    let finalUrl = feedUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    setLoading(true);
    setError("");
    setEpisodes([]);
    setSelectedIndex(null);

    try {
      const result = await fetchPodcastRSS(finalUrl);
      setFeedTitle(result.feedTitle);
      setEpisodes(result.episodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEpisode = (index: number) => {
    setSelectedIndex(index);
    const episode = episodes[index];
    const outputData = { audioUrl: episode.audioUrl, title: episode.title };
    data.updateNodeData?.(id, outputData);
    data.propagateData?.(id, outputData);
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        width: "260px",
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
            background: "#e67e22",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          R
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Podcast RSS Feed
        </span>
      </div>

      {/* Preset dropdown */}
      <select
        value={selectedPreset}
        onChange={(e) => {
          const idx = Number(e.target.value);
          setSelectedPreset(idx);
          setFeedUrl(PRESET_FEEDS[idx].url);
        }}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid #e5e5e5",
          fontSize: "12px",
          marginBottom: "8px",
          fontFamily: "inherit",
          boxSizing: "border-box",
          background: "#fff",
        }}
      >
        {PRESET_FEEDS.map((feed, idx) => (
          <option key={idx} value={idx}>
            {feed.name}
          </option>
        ))}
      </select>

      {/* Custom URL input - only show when Custom is selected */}
      {selectedPreset === PRESET_FEEDS.length - 1 && (
        <input
          type="text"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoadFeed()}
          placeholder="Enter RSS feed URL..."
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
      )}

      <button
        onClick={handleLoadFeed}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading ? "#e5e5e5" : "#e67e22",
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
        {loading ? "Loading..." : "Load Feed"}
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

      {feedTitle && episodes.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#86868b",
              marginBottom: "6px",
            }}
          >
            {feedTitle} ({episodes.length} episodes)
          </div>
          <select
            value={selectedIndex ?? ""}
            onChange={(e) => handleSelectEpisode(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #e5e5e5",
              fontSize: "12px",
              fontFamily: "inherit",
              background: "#fafafa",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <option value="" disabled>
              Select an episode...
            </option>
            {episodes.map((ep, idx) => (
              <option key={idx} value={idx}>
                {ep.title.length > 40 ? ep.title.slice(0, 40) + "..." : ep.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedIndex !== null && episodes[selectedIndex] && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#fff7ed",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#c2410c",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Selected:</div>
          {episodes[selectedIndex].title.length > 60
            ? episodes[selectedIndex].title.slice(0, 60) + "..."
            : episodes[selectedIndex].title}
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#e67e22" }}>
            Audio URL ready
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#e67e22",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
