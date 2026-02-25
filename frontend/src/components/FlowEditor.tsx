import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Selected edge styling - makes it clear what will be deleted
const edgeStyles = `
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: #ef4444 !important;
    stroke-width: 3px !important;
  }
  .react-flow__edge:hover .react-flow__edge-path {
    stroke: #f97316 !important;
  }
`;

// Source nodes
import TextInputNode from "./nodes/TextInputNode";
import ImageUploadNode from "./nodes/ImageUploadNode";
import URLInputNode from "./nodes/URLInputNode";
import PodcastEpisodeNode from "./nodes/PodcastEpisodeNode";
import PodcastRSSNode from "./nodes/PodcastRSSNode";
import AudioUploadNode from "./nodes/AudioUploadNode";
import VideoUploadNode from "./nodes/VideoUploadNode";
import PDFUploadNode from "./nodes/PDFUploadNode";
import StockTickerNode from "./nodes/StockTickerNode";
import ReportJSONNode from "./nodes/ReportJSONNode";

// Processing nodes
import EnhanceTextNode from "./nodes/EnhanceTextNode";
import IPhonePhotoNode from "./nodes/IPhonePhotoNode";
import AnimateNode from "./nodes/AnimateNode";
import TextOverlayNode from "./nodes/TextOverlayNode";
import CropNode from "./nodes/CropNode";
import TranscribeNode from "./nodes/TranscribeNode";
import GenerateReportNode from "./nodes/GenerateReportNode";
import GenerateCopyNode from "./nodes/GenerateCopyNode";
import GenerateLandingPagesNode from "./nodes/GenerateLandingPagesNode";
import GenerateAdvertorialNode from "./nodes/GenerateAdvertorialNode";
import GenerateAdvertorialCopyNode from "./nodes/GenerateAdvertorialCopyNode";
import GenerateVisualConceptsNode from "./nodes/GenerateVisualConceptsNode";
import SummarizeNode from "./nodes/SummarizeNode";
import ExtractKeyPointsNode from "./nodes/ExtractKeyPointsNode";

// Output nodes
import ImageOutputNode from "./nodes/ImageOutputNode";
import ReportPreviewNode from "./nodes/ReportPreviewNode";
import CopyExportNode from "./nodes/CopyExportNode";
import LandingPagePreviewNode from "./nodes/LandingPagePreviewNode";
import AdvertorialPreviewNode from "./nodes/AdvertorialPreviewNode";
import ImageGalleryNode from "./nodes/ImageGalleryNode";

// Utility nodes
import SplitReportSectionsNode from "./nodes/SplitReportSectionsNode";
import MergeNode from "./nodes/MergeNode";
import FilterByAngleNode from "./nodes/FilterByAngleNode";
import PlatformToggleNode from "./nodes/PlatformToggleNode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  // Sources
  textInput: TextInputNode,
  imageUpload: ImageUploadNode,
  urlInput: URLInputNode,
  podcastEpisode: PodcastEpisodeNode,
  podcastRSS: PodcastRSSNode,
  audioUpload: AudioUploadNode,
  videoUpload: VideoUploadNode,
  pdfUpload: PDFUploadNode,
  stockTicker: StockTickerNode,
  reportJSON: ReportJSONNode,
  // Processing
  enhanceText: EnhanceTextNode,
  iphonePhoto: IPhonePhotoNode,
  animate: AnimateNode,
  textOverlay: TextOverlayNode,
  crop: CropNode,
  transcribe: TranscribeNode,
  generateReport: GenerateReportNode,
  generateCopy: GenerateCopyNode,
  generateLandingPages: GenerateLandingPagesNode,
  generateAdvertorial: GenerateAdvertorialNode,
  generateAdvertorialCopy: GenerateAdvertorialCopyNode,
  generateVisualConcepts: GenerateVisualConceptsNode,
  summarize: SummarizeNode,
  extractKeyPoints: ExtractKeyPointsNode,
  // Outputs
  imageOutput: ImageOutputNode,
  reportPreview: ReportPreviewNode,
  copyExport: CopyExportNode,
  landingPagePreview: LandingPagePreviewNode,
  advertorialPreview: AdvertorialPreviewNode,
  imageGallery: ImageGalleryNode,
  // Utilities
  splitReportSections: SplitReportSectionsNode,
  merge: MergeNode,
  filterByAngle: FilterByAngleNode,
  platformToggle: PlatformToggleNode,
};

// Preset flows - hardcoded templates
interface PresetFlow {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

const presetFlows: PresetFlow[] = [
  {
    name: "Text to Photo",
    description: "Generate photo from text",
    nodes: [
      { id: "input-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 400, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "output-1", type: "imageOutput", position: { x: 700, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "input-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "URL to Photo",
    description: "Article to photo",
    nodes: [
      { id: "url-1", type: "urlInput", position: { x: 100, y: 200 }, data: { value: "", articleText: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 420, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "output-1", type: "imageOutput", position: { x: 720, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "url-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "Photo to Video",
    description: "Animate an uploaded image",
    nodes: [
      { id: "upload-1", type: "imageUpload", position: { x: 100, y: 200 }, data: { imageUrl: "" } },
      { id: "animate-1", type: "animate", position: { x: 400, y: 200 }, data: { imageUrl: "", inputValue: "", videoUrl: "" } },
      { id: "output-1", type: "imageOutput", position: { x: 700, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "upload-1", target: "animate-1", type: "smoothstep" },
      { id: "e2-3", source: "animate-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "Text to Video",
    description: "Generate photo then animate",
    nodes: [
      { id: "input-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 400, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "animate-1", type: "animate", position: { x: 700, y: 200 }, data: { imageUrl: "", inputValue: "", videoUrl: "" } },
      { id: "output-1", type: "imageOutput", position: { x: 1000, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "input-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "animate-1", type: "smoothstep" },
      { id: "e3-4", source: "animate-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "Video for Meta",
    description: "Generate video and crop to 4:5",
    nodes: [
      { id: "input-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 400, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "animate-1", type: "animate", position: { x: 700, y: 200 }, data: { imageUrl: "", inputValue: "", videoUrl: "" } },
      { id: "crop-1", type: "crop", position: { x: 1000, y: 200 }, data: { imageUrl: "", videoUrl: "", outputUrl: "" } },
      { id: "output-1", type: "imageOutput", position: { x: 1300, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "input-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "animate-1", type: "smoothstep" },
      { id: "e3-4", source: "animate-1", target: "crop-1", type: "smoothstep" },
      { id: "e4-5", source: "crop-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "FWP Pipeline",
    description: "Podcast to ads (full pipeline)",
    nodes: [
      { id: "podcast-1", type: "podcastEpisode", position: { x: 50, y: 200 }, data: { audioUrl: "", title: "" } },
      { id: "transcribe-1", type: "transcribe", position: { x: 320, y: 200 }, data: { inputValue: "", transcript: "" } },
      { id: "report-1", type: "generateReport", position: { x: 590, y: 200 }, data: { inputValue: "", report: null } },
      { id: "copy-1", type: "generateCopy", position: { x: 860, y: 100 }, data: { inputValue: "", copy: null } },
      { id: "landing-1", type: "generateLandingPages", position: { x: 860, y: 300 }, data: { inputValue: "", landingPages: null } },
      { id: "concepts-1", type: "generateVisualConcepts", position: { x: 860, y: 500 }, data: { inputValue: "", concepts: [] } },
      { id: "copyExport-1", type: "copyExport", position: { x: 1130, y: 100 }, data: { copy: null } },
      { id: "landingPreview-1", type: "landingPagePreview", position: { x: 1130, y: 300 }, data: { landingPages: null } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 1130, y: 500 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "gallery-1", type: "imageGallery", position: { x: 1400, y: 500 }, data: { images: [] } },
    ],
    edges: [
      { id: "e1-2", source: "podcast-1", target: "transcribe-1", type: "smoothstep" },
      { id: "e2-3", source: "transcribe-1", target: "report-1", type: "smoothstep" },
      { id: "e3-4", source: "report-1", target: "copy-1", type: "smoothstep" },
      { id: "e3-5", source: "report-1", target: "landing-1", type: "smoothstep" },
      { id: "e3-6", source: "report-1", target: "concepts-1", type: "smoothstep" },
      { id: "e4-7", source: "copy-1", target: "copyExport-1", type: "smoothstep" },
      { id: "e5-8", source: "landing-1", target: "landingPreview-1", type: "smoothstep" },
      { id: "e6-9", source: "concepts-1", target: "photo-1", type: "smoothstep" },
      { id: "e9-10", source: "photo-1", target: "gallery-1", type: "smoothstep" },
    ],
  },
];

// Sidebar items
const sources = [
  { type: "textInput", label: "Text Input", icon: "T", color: "#0071e3" },
  { type: "urlInput", label: "URL Input", icon: "U", color: "#0071e3" },
  { type: "imageUpload", label: "Image Upload", icon: "I", color: "#0071e3" },
  { type: "audioUpload", label: "Audio Upload", icon: "A", color: "#3498db" },
  { type: "videoUpload", label: "Video Upload", icon: "V", color: "#e74c3c" },
  { type: "pdfUpload", label: "PDF Upload", icon: "P", color: "#c0392b" },
  { type: "podcastEpisode", label: "Podcast Episode", icon: "E", color: "#9b59b6" },
  { type: "podcastRSS", label: "Podcast RSS", icon: "R", color: "#e67e22" },
  { type: "stockTicker", label: "Stock Ticker", icon: "$", color: "#27ae60" },
  { type: "reportJSON", label: "Report JSON", icon: "J", color: "#8e44ad" },
];

const operations = [
  // Text processing
  { type: "enhanceText", label: "Enhance Text", icon: "E", gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" },
  { type: "summarize", label: "Summarize", icon: "S", gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" },
  { type: "extractKeyPoints", label: "Key Points", icon: "K", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
  // Audio/Video
  { type: "transcribe", label: "Transcribe", icon: "T", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" },
  { type: "animate", label: "Animate", icon: "A", gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)" },
  { type: "crop", label: "Crop", icon: "C", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
  // Report pipeline
  { type: "generateReport", label: "Generate Report", icon: "R", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" },
  { type: "generateCopy", label: "Generate Copy", icon: "C", gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" },
  { type: "generateLandingPages", label: "Landing Pages", icon: "L", gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)" },
  { type: "generateAdvertorial", label: "Advertorial", icon: "A", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" },
  { type: "generateAdvertorialCopy", label: "Advertorial Copy", icon: "C", gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" },
  // Image generation
  { type: "generateVisualConcepts", label: "Visual Concepts", icon: "V", gradient: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)" },
  { type: "iphonePhoto", label: "Generate Image", icon: "I", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { type: "textOverlay", label: "Text Overlay", icon: "T", gradient: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)" },
];

const outputs = [
  { type: "imageOutput", label: "Output", icon: "O", gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { type: "reportPreview", label: "Report Preview", icon: "R", gradient: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)" },
  { type: "copyExport", label: "Copy Export", icon: "E", gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)" },
  { type: "landingPagePreview", label: "Landing Preview", icon: "L", gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)" },
  { type: "advertorialPreview", label: "Advertorial Preview", icon: "A", gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" },
  { type: "imageGallery", label: "Image Gallery", icon: "G", gradient: "linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)" },
];

const utilities = [
  { type: "splitReportSections", label: "Split Sections", icon: "S", gradient: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" },
  { type: "merge", label: "Merge", icon: "M", gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" },
  { type: "filterByAngle", label: "Filter Angle", icon: "F", gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" },
  { type: "platformToggle", label: "Platform", icon: "P", gradient: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" },
];

export default function FlowEditor() {
  // Start with empty canvas
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const nodeIdCounter = useRef(1);

  // Load a preset flow
  const loadPreset = useCallback((preset: PresetFlow) => {
    // Check if canvas has content
    if (nodes.length > 0) {
      if (!confirm(`This will replace your current flow. Continue?`)) {
        return;
      }
    }

    setNodes(preset.nodes);
    setEdges(preset.edges);

    // Update node counter to avoid ID conflicts
    const maxId = preset.nodes.reduce((max, node) => {
      const match = node.id.match(/-(\d+)$/);
      const num = match ? parseInt(match[1]) : 0;
      return Math.max(max, num);
    }, 0);
    nodeIdCounter.current = maxId + 1;
  }, [nodes.length, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Add the edge
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds));

      // Propagate data from source to target when connection is made
      if (params.source && params.target) {
        const sourceNode = nodes.find((n) => n.id === params.source);
        if (sourceNode) {
          const sourceData = sourceNode.data;

          // Determine what data to propagate based on source node type
          const dataToPropagate: Record<string, unknown> = {};

          // Text input nodes have "value"
          if (sourceData.value !== undefined) {
            dataToPropagate.inputValue = sourceData.value;
          }

          // Operation nodes may have outputValue (enhance text)
          if (sourceData.outputValue) {
            dataToPropagate.inputValue = sourceData.outputValue;
          }

          // Image-producing nodes have imageUrl and prompt
          if (sourceData.imageUrl) {
            dataToPropagate.imageUrl = sourceData.imageUrl;
            dataToPropagate.inputValue = sourceData.prompt || sourceData.imageUrl;
          }
          if (sourceData.prompt) {
            dataToPropagate.prompt = sourceData.prompt;
          }

          // Video-producing nodes have videoUrl
          if (sourceData.videoUrl) {
            dataToPropagate.imageUrl = sourceData.videoUrl; // Output node uses imageUrl for both
            dataToPropagate.inputValue = sourceData.videoUrl;
          }

          // Text overlay has outputUrl
          if (sourceData.outputUrl) {
            dataToPropagate.imageUrl = sourceData.outputUrl;
          }

          // Update the target node if we have data to propagate
          if (Object.keys(dataToPropagate).length > 0) {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === params.target
                  ? { ...node, data: { ...node.data, ...dataToPropagate } }
                  : node
              )
            );
          }
        }
      }
    },
    [setEdges, nodes, setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
    },
    [setNodes]
  );

  const propagateData = useCallback(
    (sourceId: string, value: string) => {
      const outgoingEdges = edges.filter((e) => e.source === sourceId);
      if (outgoingEdges.length > 1) {
        console.log(`Multi-output: Propagating data from ${sourceId} to ${outgoingEdges.length} targets:`, outgoingEdges.map(e => e.target));
      }
      for (const edge of outgoingEdges) {
        updateNodeData(edge.target, { inputValue: value });
      }
    },
    [edges, updateNodeData]
  );

  const propagateOutput = useCallback(
    (sourceId: string, imageUrl: string, prompt: string) => {
      const outgoingEdges = edges.filter((e) => e.source === sourceId);
      if (outgoingEdges.length > 1) {
        console.log(`Multi-output: Propagating output from ${sourceId} to ${outgoingEdges.length} targets:`, outgoingEdges.map(e => e.target));
      }
      for (const edge of outgoingEdges) {
        // Set both imageUrl/prompt for output nodes AND inputValue for chaining to other operations
        updateNodeData(edge.target, { imageUrl, prompt, inputValue: prompt });
      }
    },
    [edges, updateNodeData]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Initial data for each node type
  const getInitialData = (type: string): Record<string, unknown> => {
    switch (type) {
      // Sources
      case "textInput": return { value: "" };
      case "imageUpload": return { imageUrl: "" };
      case "urlInput": return { value: "", articleText: "" };
      case "audioUpload": return { audioBase64: "", mimeType: "", filename: "" };
      case "videoUpload": return { videoBase64: "", mimeType: "", filename: "" };
      case "pdfUpload": return { pdfBase64: "", filename: "" };
      case "podcastEpisode": return { audioUrl: "", title: "" };
      case "podcastRSS": return { audioUrl: "", title: "", episodes: [] };
      case "stockTicker": return { ticker: "", name: "", price: 0, fundamentals: {} };
      case "reportJSON": return { report: null };
      // Processing
      case "enhanceText": return { inputValue: "", outputValue: "" };
      case "transcribe": return { inputValue: "", transcript: "" };
      case "generateReport": return { inputValue: "", report: null };
      case "generateCopy": return { inputValue: "", copy: null };
      case "generateLandingPages": return { inputValue: "", landingPages: null };
      case "generateAdvertorial": return { inputValue: "", headline: "", content: "" };
      case "generateAdvertorialCopy": return { inputValue: "", adCopy: null };
      case "generateVisualConcepts": return { inputValue: "", concepts: [] };
      case "summarize": return { inputValue: "", summary: "" };
      case "extractKeyPoints": return { inputValue: "", points: [] };
      case "iphonePhoto": return { inputValue: "", imageUrl: "", prompt: "", loading: false };
      case "animate": return { imageUrl: "", inputValue: "", videoUrl: "" };
      case "textOverlay": return { imageUrl: "", inputValue: "", outputUrl: "" };
      case "crop": return { imageUrl: "", videoUrl: "", outputUrl: "" };
      // Outputs
      case "imageOutput": return { imageUrl: "", prompt: "" };
      case "reportPreview": return { report: null };
      case "copyExport": return { copy: null };
      case "landingPagePreview": return { landingPages: null };
      case "advertorialPreview": return { headline: "", content: "" };
      case "imageGallery": return { images: [] };
      // Utilities
      case "splitReportSections": return { report: null, sections: [] };
      case "merge": return { inputs: [] };
      case "filterByAngle": return { inputValue: null, angle: "fear" };
      case "platformToggle": return { platform: "google" };
      default: return { inputValue: "" };
    }
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = { x: event.clientX - 280, y: event.clientY - 100 };
      const newNode: Node = {
        id: `${type}-${nodeIdCounter.current++}`,
        type,
        position,
        data: getInitialData(type),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <style>{edgeStyles}</style>
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          background: "#fff",
          borderRight: "1px solid #e5e5e5",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "-0.3px",
              marginBottom: "4px",
            }}
          >
            flow-ops
          </h1>
          <p style={{ fontSize: "13px", color: "#86868b" }}>
            Drag nodes to build
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Sources
          </h3>
          {sources.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 10px",
                background: "#f5f5f7",
                borderRadius: "10px",
                marginBottom: "4px",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: item.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Operations
          </h3>
          {operations.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 10px",
                background: "#f5f5f7",
                borderRadius: "10px",
                marginBottom: "4px",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: item.gradient,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            Outputs
          </h3>
          {outputs.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 10px",
                background: "#f5f5f7",
                borderRadius: "10px",
                marginBottom: "4px",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: item.gradient,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            Utilities
          </h3>
          {utilities.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 10px",
                background: "#f5f5f7",
                borderRadius: "10px",
                marginBottom: "4px",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: item.gradient,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid #e5e5e5" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Presets
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {presetFlows.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  background: "#f5f5f7",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e8e8ed";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f5f5f7";
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{preset.name}</span>
                <span style={{ fontSize: "11px", color: "#86868b" }}>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              updateNodeData,
              propagateData,
              propagateOutput,
            },
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Delete", "Backspace"]}
          style={{ background: "#fafafa" }}
          defaultEdgeOptions={{
            style: { stroke: "#d1d1d6", strokeWidth: 2 },
          }}
        >
          <Controls
            style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e5e5" }}
          />
          <Background color="#e5e5e5" gap={24} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
