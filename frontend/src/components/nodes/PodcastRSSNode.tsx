import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { fetchPodcastRSS, fetchPodcastEpisode, setDebugContext } from "../../api";

interface Episode {
  title: string;
  audioUrl: string;
  pubDate?: string;
}

interface PodcastRSSNodeProps {
  id: string;
  data: {
    feedUrl?: string;
    audioUrl?: string;
    title?: string;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

// Preset options: RSS feeds + direct episode link
const PRESET_OPTIONS = [
  { name: "AI Investor Podcast", url: "https://rss.buzzsprout.com/2400102.rss", mode: "rss" as const },
  { name: "Custom URL", url: "", mode: "rss" as const },
  { name: "Direct Episode Link", url: "", mode: "direct" as const },
];

export default function PodcastRSSNode({ id, data }: PodcastRSSNodeProps) {
  const [selectedPreset, setSelectedPreset] = useState(data.feedUrl ? -1 : 0);
  const [feedUrl, setFeedUrl] = useState(data.feedUrl || PRESET_OPTIONS[0].url);
  const [directUrl, setDirectUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedTitle, setFeedTitle] = useState("");
  // For direct episode link mode
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeAudioUrl, setEpisodeAudioUrl] = useState("");

  const currentMode = selectedPreset >= 0 ? PRESET_OPTIONS[selectedPreset].mode : "rss";

  // Load RSS feed and list episodes
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
      setDebugContext({ nodeId: id, nodeName: "Podcast" });
      const result = await fetchPodcastRSS(finalUrl);
      setFeedTitle(result.feedTitle);
      setEpisodes(result.episodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  // Fetch a direct episode link
  const handleFetchEpisode = async () => {
    if (!directUrl.trim()) {
      setError("Enter a podcast episode URL first");
      return;
    }

    let finalUrl = directUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    setLoading(true);
    setError("");

    try {
      setDebugContext({ nodeId: id, nodeName: "Podcast" });
      const result = await fetchPodcastEpisode(finalUrl);
      setEpisodeTitle(result.title);
      setEpisodeAudioUrl(result.audioUrl);

      const outputData = { audioUrl: result.audioUrl, title: result.title };
      data.updateNodeData?.(id, outputData);
      data.propagateData?.(id, outputData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch episode");
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
          P
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Podcast
        </span>
      </div>

      {/* Preset dropdown */}
      <select
        value={selectedPreset}
        onChange={(e) => {
          const idx = Number(e.target.value);
          setSelectedPreset(idx);
          if (PRESET_OPTIONS[idx].mode === "rss") {
            setFeedUrl(PRESET_OPTIONS[idx].url);
          }
          // Clear previous results when switching mode
          setEpisodes([]);
          setSelectedIndex(null);
          setFeedTitle("");
          setEpisodeTitle("");
          setEpisodeAudioUrl("");
          setError("");
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
        {PRESET_OPTIONS.map((option, idx) => (
          <option key={idx} value={idx}>
            {option.name}
          </option>
        ))}
      </select>

      {/* RSS mode: Custom URL input */}
      {currentMode === "rss" && selectedPreset === 1 && (
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

      {/* Direct episode mode: URL input */}
      {currentMode === "direct" && (
        <input
          type="text"
          value={directUrl}
          onChange={(e) => setDirectUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetchEpisode()}
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
      )}

      {/* Action button */}
      <button
        onClick={currentMode === "direct" ? handleFetchEpisode : handleLoadFeed}
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
        {loading
          ? "Loading..."
          : currentMode === "direct"
            ? "Fetch Episode"
            : "Load Feed"}
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

      {/* RSS mode: episode list */}
      {currentMode === "rss" && feedTitle && episodes.length > 0 && (
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

      {/* RSS mode: selected episode info */}
      {currentMode === "rss" && selectedIndex !== null && episodes[selectedIndex] && (
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

      {/* Direct mode: fetched episode info */}
      {currentMode === "direct" && episodeTitle && !loading && (
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
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Episode:</div>
          {episodeTitle.length > 60 ? episodeTitle.slice(0, 60) + "..." : episodeTitle}
          {episodeAudioUrl && (
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#e67e22" }}>
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
          background: "#e67e22",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
