import { Handle, Position } from "@xyflow/react";
import { useState, useEffect } from "react";
import { generatePhoto } from "../../api";

// Visual concept structure from GenerateVisualConceptsNode
interface VisualConcept {
  concept: string;
  targetEmotion: string;
  colorScheme: string;
}

interface IPhonePhotoNodeProps {
  id: string;
  data: {
    inputValue: string;
    imageUrl: string;
    prompt: string;
    loading: boolean;
    // Visual concept can be passed directly or parsed from inputValue JSON
    visualConcept?: VisualConcept;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateOutput?: (sourceId: string, imageUrl: string, prompt: string) => void;
  };
}

export default function IPhonePhotoNode({ id, data }: IPhonePhotoNodeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(data.imageUrl || "");
  const [done, setDone] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [format, setFormat] = useState<"square" | "landscape" | "portrait" | "vertical">("square");
  const [model, setModel] = useState<"gemini-flash" | "gemini-pro">("gemini-flash");
  const [useRealismPrompt, setUseRealismPrompt] = useState(false);

  const inputValue = data.inputValue || "";
  const inputImageUrl = data.imageUrl || "";

  // Try to parse visual concept from input
  const getVisualConcept = (): VisualConcept | null => {
    if (data.visualConcept) return data.visualConcept;
    if (!inputValue) return null;

    try {
      const parsed = JSON.parse(inputValue);
      // Check if it's a single concept
      if (parsed.concept && parsed.targetEmotion && parsed.colorScheme) {
        return parsed as VisualConcept;
      }
      // Check if it's a concepts array (pick first one)
      if (parsed.concepts && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
        return parsed.concepts[0] as VisualConcept;
      }
    } catch {
      // Not JSON, not a visual concept
    }
    return null;
  };

  const visualConcept = getVisualConcept();

  // Auto-enable realism prompt when visual concept is detected
  useEffect(() => {
    if (visualConcept) {
      setUseRealismPrompt(true);
    }
  }, [visualConcept]);

  // FWP realism guidelines for human subjects (from section 5d of FWP-PROMPT-REFERENCE.md)
  const buildRealismPrompt = (concept: VisualConcept): string => {
    return `Create a photorealistic image for a digital advertisement. This must look like a real photograph.

SUBJECT: ${concept.concept}

EMOTIONAL TARGET: ${concept.targetEmotion}

COLOR/LIGHTING: ${concept.colorScheme}

PHOTOREALISM REQUIREMENTS FOR HUMAN SUBJECTS:
This must look like a real photograph, not AI-generated art.

Photography style:
- Shot on Canon 5D or Sony A7, 50-85mm lens, f/2.8 aperture
- Natural available light or soft window light
- Shallow depth of field with natural background bokeh
- Slight film grain, natural color grading

Human appearance (avoid "AI sheen"):
- Natural skin texture: visible pores, subtle imperfections
- Age-appropriate details: wrinkles, laugh lines for older subjects
- Real hair: individual strands visible, slight flyaways
- Authentic eyes: natural moisture/depth, realistic catchlights
- Natural expressions: candid, genuine, not performative

What to AVOID:
- Poreless, waxy, or plastic-looking skin
- Perfectly uniform lighting
- Hair that looks painted or unnaturally smooth
- Glassy, lifeless eyes
- Overly symmetrical facial features
- Theatrical or stock-photo-style expressions

PHOTOGRAPHY DIRECTION:
- This is a REAL PHOTOGRAPH, not digital art or illustration
- Shot on professional camera (Canon 5D, Sony A7) with 50-85mm lens
- Natural or professional studio lighting appropriate to the scene
- Shallow depth of field where appropriate (f/2.8 for portraits, deeper for scenes)
- The subject should be positioned to leave space for text overlay (rule of thirds)

COMPOSITION RULES:
1. ONE clear focal point - the viewer's eye should go directly to it
2. Clean, uncluttered background (bokeh, solid, or simple environment)
3. Subject in the center 70% of frame (edges may be cropped by platforms)
4. Professional, aspirational, trustworthy feel

ABSOLUTELY FORBIDDEN:
- Any text, words, numbers, labels, or UI elements
- Charts, graphs, arrows, data visualizations
- Multiple competing focal points
- Logos, watermarks, or brand elements
- Anything that looks AI-generated (plastic skin, weird hands, uncanny valley)`;
  };

  const handleGenerate = async () => {
    if (!inputValue.trim() && !inputImageUrl && !visualConcept) {
      setError("Connect a text, image, or visual concept input first");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      // Determine what prompt to use
      let promptText = inputValue;

      // If we have a visual concept and realism is enabled, use the detailed FWP prompt
      if (visualConcept && useRealismPrompt) {
        promptText = buildRealismPrompt(visualConcept);
      } else if (visualConcept) {
        // Simple concept prompt without full realism guidelines
        promptText = `${visualConcept.concept}. Emotion: ${visualConcept.targetEmotion}. Colors: ${visualConcept.colorScheme}`;
      }

      const result = await generatePhoto(promptText, extraInstructions || undefined, inputImageUrl || undefined, format, model);
      setImageUrl(result.imageUrl);
      setDone(true);
      data.updateNodeData?.(id, { imageUrl: result.imageUrl, prompt: result.prompt });
      data.propagateOutput?.(id, result.imageUrl, result.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
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
          background: "#667eea",
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
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
          iPhone Photo
        </span>
      </div>

      {inputImageUrl && (
        <div
          style={{
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: "#f5f5f7",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={inputImageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "#86868b" }}>Input image</span>
        </div>
      )}

      {/* Visual concept preview (takes priority over raw text) */}
      {visualConcept && (
        <div
          style={{
            background: "#f0fdfa",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#0d9488",
            marginBottom: "10px",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "2px" }}>Visual Concept</div>
          <div style={{ fontSize: "10px", color: "#14b8a6" }}>
            {visualConcept.targetEmotion} | {visualConcept.colorScheme.slice(0, 30)}...
          </div>
        </div>
      )}

      {/* Plain text input preview (only if no visual concept) */}
      {inputValue && !visualConcept && (
        <div
          style={{
            background: "#f5f5f7",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#86868b",
            marginBottom: "10px",
            lineHeight: "1.4",
            maxHeight: "40px",
            overflow: "hidden",
          }}
        >
          {inputValue.slice(0, 60)}
          {inputValue.length > 60 && "..."}
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
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as "gemini-flash" | "gemini-pro")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="gemini-flash">Gemini 2.5 Flash (~$0.04)</option>
              <option value="gemini-pro">Gemini 3 Pro (~$0.24)</option>
            </select>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "10px", color: "#86868b", display: "block", marginBottom: "4px" }}>
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "square" | "landscape" | "portrait" | "vertical")}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              <option value="square">Square (1:1)</option>
              <option value="landscape">Landscape (16:9)</option>
              <option value="portrait">Portrait (4:5) - Meta Feeds</option>
              <option value="vertical">Vertical (9:16) - Stories/Reels</option>
            </select>
          </div>
          {/* FWP Realism toggle (auto-enabled when visual concept detected) */}
          {visualConcept && (
            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#1d1d1f",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={useRealismPrompt}
                  onChange={(e) => setUseRealismPrompt(e.target.checked)}
                  style={{ accentColor: "#667eea" }}
                />
                FWP Realism Prompt
              </label>
              <div style={{ fontSize: "9px", color: "#86868b", marginTop: "2px" }}>
                Uses detailed photorealism guidelines
              </div>
            </div>
          )}
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="Extra instructions..."
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              fontSize: "11px",
              resize: "none",
              minHeight: "50px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading
            ? "#e5e5e5"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
        {loading ? "Generating..." : "Generate"}
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

      {done && imageUrl && !loading && (
        <div
          onClick={() => setShowLightbox(true)}
          style={{
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: "#f0fdf4",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#dcfce7";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f0fdf4";
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 500 }}>
            Click to view
          </span>
        </div>
      )}

      {/* Lightbox modal */}
      {showLightbox && imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <img
            src={imageUrl}
            alt="Generated photo"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: "12px",
              boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              color: "#fff",
              fontSize: "14px",
              opacity: 0.7,
            }}
          >
            Click anywhere to close
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#764ba2",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
