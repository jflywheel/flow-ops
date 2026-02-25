import { Handle, Position } from "@xyflow/react";

interface OutputNodeProps {
  data: {
    imageUrl: string;
    prompt: string;
    inputValue?: string;
  };
}

// Detect content type from URL or data
function getContentType(url: string): "image" | "video" | "text" | "none" {
  if (!url) return "none";

  // Video detection - check data URL first
  if (url.startsWith("data:video/")) {
    return "video";
  }

  // Video detection - URL patterns
  if (
    url.includes("/video") ||
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.includes("generativelanguage.googleapis.com")
  ) {
    return "video";
  }

  // Image detection
  if (
    url.startsWith("data:image/") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".gif") ||
    url.endsWith(".webp")
  ) {
    return "image";
  }

  // If it looks like a URL, assume image
  if (url.startsWith("http") || url.startsWith("data:")) {
    return "image";
  }

  // Otherwise it's text
  return "text";
}

export default function ImageOutputNode({ data }: OutputNodeProps) {
  const { imageUrl, prompt, inputValue } = data;

  // Use imageUrl as the primary content, fall back to inputValue for text
  const content = imageUrl || inputValue || "";
  const contentType = getContentType(content);

  // For text content, use inputValue or prompt
  const textContent = contentType === "text" ? content : (contentType === "none" ? inputValue : "");

  const handleDownload = async () => {
    if (!content || contentType === "text" || contentType === "none") return;

    try {
      const response = await fetch(content);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = contentType === "video"
        ? `video-${Date.now()}.mp4`
        : `photo-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(content, "_blank");
    }
  };

  const hasDownloadableContent = contentType === "image" || contentType === "video";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        minWidth: "320px",
        maxWidth: "400px",
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
          background: "#11998e",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            O
          </div>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
            Output
          </span>
        </div>

        {hasDownloadableContent && (
          <button
            onClick={handleDownload}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#f5f5f7",
              color: "#1d1d1f",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e8e8ed";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f5f5f7";
            }}
          >
            Download
          </button>
        )}
      </div>

      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          background: "#f5f5f7",
          minHeight: contentType === "text" ? "100px" : "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {contentType === "video" && (
          <video
            src={content}
            controls
            autoPlay
            loop
            muted
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        )}

        {contentType === "image" && (
          <img
            src={content}
            alt="Generated"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        )}

        {contentType === "text" && (
          <div
            style={{
              padding: "16px",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#1d1d1f",
              width: "100%",
              maxHeight: "300px",
              overflow: "auto",
            }}
          >
            {textContent || content}
          </div>
        )}

        {contentType === "none" && !textContent && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#86868b",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#e8e8ed",
                margin: "0 auto 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              O
            </div>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>
              Output will appear here
            </div>
          </div>
        )}
      </div>

      {prompt && prompt !== "animated" && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            background: "#f5f5f7",
            borderRadius: "10px",
            fontSize: "12px",
            color: "#86868b",
            lineHeight: "1.5",
            maxHeight: "80px",
            overflow: "auto",
          }}
        >
          <strong style={{ color: "#1d1d1f" }}>Prompt:</strong> {prompt}
        </div>
      )}
    </div>
  );
}
