import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

interface ImageConcept {
  concept?: string;
  url?: string;
  image?: string;
}

interface ImageGalleryData {
  concepts?: ImageConcept[];
  images?: string[];
}

interface ImageGalleryNodeProps {
  data: {
    gallery?: ImageGalleryData;
    images?: string[];
    inputValue?: string | ImageGalleryData | string[];
  };
}

export default function ImageGalleryNode({ data }: ImageGalleryNodeProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Extract images from various input formats
  let images: string[] = [];

  // Direct images array
  if (data.images && Array.isArray(data.images)) {
    images = data.images;
  }
  // Gallery object with concepts or images
  else if (data.gallery) {
    if (data.gallery.images) {
      images = data.gallery.images;
    } else if (data.gallery.concepts) {
      images = data.gallery.concepts
        .map((c) => c.url || c.image)
        .filter(Boolean) as string[];
    }
  }
  // Parse from inputValue
  else if (data.inputValue) {
    try {
      const parsed = typeof data.inputValue === "string"
        ? JSON.parse(data.inputValue)
        : data.inputValue;

      if (Array.isArray(parsed)) {
        // Array of strings or objects
        images = parsed
          .map((item) => (typeof item === "string" ? item : item.url || item.image))
          .filter(Boolean);
      } else if (parsed.images) {
        images = parsed.images;
      } else if (parsed.concepts) {
        images = parsed.concepts
          .map((c: ImageConcept) => c.url || c.image)
          .filter(Boolean);
      }
    } catch {
      // Not valid JSON, might be a single URL
      if (typeof data.inputValue === "string" && data.inputValue.startsWith("http")) {
        images = [data.inputValue];
      }
    }
  }

  const hasImages = images.length > 0;

  const handleDownloadAll = async () => {
    if (images.length === 0) return;

    setDownloading(true);

    try {
      // Download each image individually (simple approach without JSZip)
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `image-${i + 1}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);

          // Small delay between downloads
          if (i < images.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch {
          // Open in new tab if download fails
          window.open(url, "_blank");
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingle = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "20px",
          width: "340px",
          maxHeight: "480px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e5e5e5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: "12px",
            height: "12px",
            background: "#14b8a6",
            border: "2px solid #fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              G
            </div>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f" }}>
              Image Gallery
            </span>
          </div>
          {hasImages && (
            <span
              style={{
                fontSize: "12px",
                color: "#86868b",
                background: "#f5f5f7",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              {images.length} images
            </span>
          )}
        </div>

        {hasImages ? (
          <>
            {/* Image grid */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              {images.map((url, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImage(url)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: "10px",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "#f5f5f7",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: downloading
                  ? "#e5e5e5"
                  : "linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)",
                color: downloading ? "#86868b" : "#fff",
                cursor: downloading ? "wait" : "pointer",
                fontSize: "14px",
                fontWeight: 600,
                transition: "transform 0.1s",
                flexShrink: 0,
              }}
              onMouseDown={(e) => {
                if (!downloading) e.currentTarget.style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {downloading ? "Downloading..." : "Download All"}
            </button>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 20px",
              background: "#f5f5f7",
              borderRadius: "12px",
              color: "#86868b",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#e8e8ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                marginBottom: "12px",
              }}
            >
              G
            </div>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>
              Connect image source
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Array of URLs or concepts
            </div>
          </div>
        )}
      </div>

      {/* Modal for enlarged image */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
          >
            <img
              src={selectedImage}
              alt="Enlarged"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "12px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => handleDownloadSingle(selectedImage)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#fff",
                  color: "#1d1d1f",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Download
              </button>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
