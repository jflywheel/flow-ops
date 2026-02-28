import { useCallback, useRef, useEffect, useState } from "react";
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

// Debug panel for inspecting API calls
import DebugPanel from "./DebugPanel";
import { subscribe as subscribeDebug, getEntryCount } from "../debugLog";

// Selected edge styling + sidebar tooltip styling
const edgeStyles = `
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: #ef4444 !important;
    stroke-width: 3px !important;
  }
  .react-flow__edge:hover .react-flow__edge-path {
    stroke: #f97316 !important;
  }

  /* Sidebar tooltip - rendered as fixed-position overlay via JS */
  .sidebar-tooltip-portal {
    position: fixed;
    background: #1d1d1f;
    color: #fff;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 11px;
    line-height: 1.45;
    width: 200px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 9999;
    pointer-events: none;
    animation: sidebarTTFadeIn 0.15s ease-out both;
  }
  .sidebar-tooltip-portal::before {
    content: "";
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: #1d1d1f;
  }
  @keyframes sidebarTTFadeIn {
    from { opacity: 0; transform: translateX(-4px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .sidebar-tooltip-portal .tt-desc {
    margin-bottom: 6px;
    color: #e5e5ea;
  }
  .sidebar-tooltip-portal .tt-row {
    display: flex;
    gap: 4px;
  }
  .sidebar-tooltip-portal .tt-label {
    color: #86868b;
    flex-shrink: 0;
  }
  .sidebar-tooltip-portal .tt-value {
    color: #fff;
  }
`;

// Source nodes
import TextInputNode from "./nodes/TextInputNode";
import ImageUploadNode from "./nodes/ImageUploadNode";
import URLInputNode from "./nodes/URLInputNode";
import PodcastRSSNode from "./nodes/PodcastRSSNode";
import AudioUploadNode from "./nodes/AudioUploadNode";
import VideoUploadNode from "./nodes/VideoUploadNode";
import PDFUploadNode from "./nodes/PDFUploadNode";
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
import GenerateMetaHeadlinesNode from "./nodes/GenerateMetaHeadlinesNode";
import GenerateYouTubeThumbnailsNode from "./nodes/GenerateYouTubeThumbnailsNode";

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

// Chat panel for natural language flow building
import ChatPanel from "./ChatPanel";

// Self-test runner
import SelfTest from "./SelfTest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  // Sources
  textInput: TextInputNode,
  imageUpload: ImageUploadNode,
  urlInput: URLInputNode,
  podcastRSS: PodcastRSSNode,
  audioUpload: AudioUploadNode,
  videoUpload: VideoUploadNode,
  pdfUpload: PDFUploadNode,
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
  generateMetaHeadlines: GenerateMetaHeadlinesNode,
  generateYouTubeThumbnails: GenerateYouTubeThumbnailsNode,
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
    name: "Podcast to Report",
    description: "Transcribe podcast → generate report",
    nodes: [
      { id: "podcast-1", type: "podcastRSS", position: { x: 50, y: 200 }, data: { audioUrl: "", title: "" } },
      { id: "transcribe-1", type: "transcribe", position: { x: 350, y: 200 }, data: { inputValue: "", transcript: "" } },
      { id: "report-1", type: "generateReport", position: { x: 650, y: 200 }, data: { inputValue: "", report: null } },
      { id: "preview-1", type: "reportPreview", position: { x: 950, y: 200 }, data: { report: null } },
    ],
    edges: [
      { id: "e1-2", source: "podcast-1", target: "transcribe-1", type: "smoothstep" },
      { id: "e2-3", source: "transcribe-1", target: "report-1", type: "smoothstep" },
      { id: "e3-4", source: "report-1", target: "preview-1", type: "smoothstep" },
    ],
  },
  {
    name: "FWP Pipeline",
    description: "Podcast to ads (full pipeline)",
    nodes: [
      { id: "podcast-1", type: "podcastRSS", position: { x: 50, y: 200 }, data: { feedUrl: "", audioUrl: "", title: "" } },
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

// Tooltip info for sidebar items
interface TooltipInfo {
  description: string;
  inputType: string;
  outputType: string;
}

// Sidebar items with tooltip metadata
interface SidebarItem {
  type: string;
  label: string;
  icon: string;
  color?: string;
  gradient?: string;
  tooltip: TooltipInfo;
}

const sources: SidebarItem[] = [
  { type: "textInput", label: "Text Input", icon: "T", color: "#0071e3",
    tooltip: { description: "Type or paste text directly.", inputType: "None (manual entry)", outputType: "Text" } },
  { type: "urlInput", label: "URL Input", icon: "U", color: "#0071e3",
    tooltip: { description: "Fetches a URL and extracts the article text using AI.", inputType: "None (enter URL)", outputType: "Text" } },
  { type: "imageUpload", label: "Image Upload", icon: "I", color: "#0071e3",
    tooltip: { description: "Upload an image file from your device.", inputType: "None (file picker)", outputType: "Image" } },
  { type: "audioUpload", label: "Audio Upload", icon: "A", color: "#3498db",
    tooltip: { description: "Upload an MP3, M4A, or WAV audio file.", inputType: "None (file picker)", outputType: "Audio (base64)" } },
  { type: "videoUpload", label: "Video Upload", icon: "V", color: "#e74c3c",
    tooltip: { description: "Upload an MP4, MOV, or WebM video file.", inputType: "None (file picker)", outputType: "Video (base64)" } },
  { type: "pdfUpload", label: "PDF Upload", icon: "P", color: "#c0392b",
    tooltip: { description: "Upload a PDF document.", inputType: "None (file picker)", outputType: "PDF (base64)" } },
  { type: "podcastRSS", label: "Podcast", icon: "P", color: "#e67e22",
    tooltip: { description: "Load an RSS feed, pick an episode, or paste a direct episode link.", inputType: "None (enter URL)", outputType: "Audio URL" } },
];

const operations: SidebarItem[] = [
  // Text processing
  { type: "summarize", label: "Summarize Text", icon: "S", gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    tooltip: { description: "Condenses text to a shorter summary.", inputType: "Text or Report JSON", outputType: "Text" } },
  { type: "extractKeyPoints", label: "Key Points", icon: "K", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    tooltip: { description: "Pulls out the main bullet points from text.", inputType: "Text or Report JSON", outputType: "Bullet list (text)" } },
  // Audio/Video
  { type: "transcribe", label: "Transcribe Audio", icon: "T", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    tooltip: { description: "Converts audio to text with speaker labels.", inputType: "Audio URL or audio file", outputType: "Transcript (text)" } },
  { type: "animate", label: "Image to Video", icon: "A", gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    tooltip: { description: "Animates a still image into a short video using Veo.", inputType: "Image", outputType: "Video" } },
  { type: "crop", label: "Crop Image/Video", icon: "C", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    tooltip: { description: "Crops to a target aspect ratio (4:5, 1:1, 16:9, 9:16).", inputType: "Image or Video", outputType: "Image or Video" } },
  // Report pipeline
  { type: "generateReport", label: "Generate Report", icon: "R", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    tooltip: { description: "Creates a structured report from a transcript or text.", inputType: "Text or Transcript", outputType: "Report JSON" } },
  { type: "generateCopy", label: "Generate Ad Copy", icon: "C", gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    tooltip: { description: "Generates ad copy variants (fear, greed, curiosity, urgency).", inputType: "Report JSON", outputType: "Ad copy (JSON)" } },
  { type: "generateLandingPages", label: "Landing Pages", icon: "L", gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    tooltip: { description: "Creates landing page content for each angle.", inputType: "Report JSON", outputType: "Landing pages (JSON)" } },
  { type: "generateAdvertorial", label: "Advertorial Article", icon: "A", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    tooltip: { description: "Writes a long-form advertorial article from a report.", inputType: "Report JSON", outputType: "HTML article" } },
  { type: "generateAdvertorialCopy", label: "Advertorial Ad Copy", icon: "C", gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    tooltip: { description: "Creates Meta ad copy to promote an advertorial.", inputType: "Advertorial HTML", outputType: "Ad copy (JSON)" } },
  { type: "generateMetaHeadlines", label: "Meta Ad Headlines", icon: "M", gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    tooltip: { description: "Generates 5 primary texts and 5 headlines for Meta ads.", inputType: "Text or Transcript", outputType: "Headlines + texts" } },
  { type: "generateYouTubeThumbnails", label: "YT Thumbnails", icon: "\u25b6", gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    tooltip: { description: "Generates 5 YouTube thumbnail images from a transcript.", inputType: "Transcript + reference photo", outputType: "5 thumbnail images" } },
  // Image generation
  { type: "generateVisualConcepts", label: "Visual Concepts", icon: "V", gradient: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
    tooltip: { description: "Creates visual concept descriptions for image generation.", inputType: "Report JSON or text", outputType: "Concept list (JSON)" } },
  { type: "iphonePhoto", label: "Generate Image", icon: "I", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tooltip: { description: "Generates a photorealistic image from text using Gemini.", inputType: "Text or visual concept", outputType: "Image" } },
  { type: "textOverlay", label: "Text on Image", icon: "T", gradient: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
    tooltip: { description: "Adds text overlay on top of an image.", inputType: "Image", outputType: "Image" } },
];

const outputs: SidebarItem[] = [
  { type: "imageOutput", label: "Media Output", icon: "O", gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    tooltip: { description: "Displays an image or video result.", inputType: "Image, Video, or Text", outputType: "Display only" } },
  { type: "reportPreview", label: "Report Preview", icon: "R", gradient: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
    tooltip: { description: "Renders a formatted preview of a report.", inputType: "Report JSON", outputType: "Display only" } },
  { type: "copyExport", label: "Copy Export", icon: "E", gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
    tooltip: { description: "Shows ad copy variants with a copy-to-clipboard button.", inputType: "Ad copy (JSON)", outputType: "Display only" } },
  { type: "landingPagePreview", label: "Landing Preview", icon: "L", gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
    tooltip: { description: "Previews landing page content by angle.", inputType: "Landing pages (JSON)", outputType: "Display only" } },
  { type: "advertorialPreview", label: "Advertorial Preview", icon: "A", gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
    tooltip: { description: "Renders an advertorial article preview.", inputType: "Advertorial HTML", outputType: "Display only" } },
  { type: "imageGallery", label: "Image Gallery", icon: "G", gradient: "linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)",
    tooltip: { description: "Shows a grid of generated images with download.", inputType: "Image array", outputType: "Display only" } },
];

const utilities: SidebarItem[] = [
  { type: "splitReportSections", label: "Split Sections", icon: "S", gradient: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
    tooltip: { description: "Splits a report into individual section outputs.", inputType: "Report JSON", outputType: "One output per section" } },
  { type: "merge", label: "Merge Data", icon: "M", gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
    tooltip: { description: "Combines up to 4 inputs into a single array.", inputType: "Any (up to 4 inputs)", outputType: "Merged array (JSON)" } },
  { type: "filterByAngle", label: "Filter by Angle", icon: "F", gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    tooltip: { description: "Picks one angle (fear, greed, curiosity, urgency) from copy data.", inputType: "Ad copy or landing pages", outputType: "Single angle data" } },
  { type: "platformToggle", label: "Platform Toggle", icon: "P", gradient: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
    tooltip: { description: "Switches between Google and Meta ad platforms.", inputType: "None (toggle)", outputType: "Platform setting" } },
];

// localStorage keys
const STORAGE_KEY_NODES = "flow-ops-nodes";
const STORAGE_KEY_EDGES = "flow-ops-edges";
const STORAGE_KEY_COUNTER = "flow-ops-counter";

// Load initial state from localStorage
function loadFromStorage(): { nodes: Node[]; edges: Edge[]; counter: number } {
  try {
    const nodesJson = localStorage.getItem(STORAGE_KEY_NODES);
    const edgesJson = localStorage.getItem(STORAGE_KEY_EDGES);
    const counterStr = localStorage.getItem(STORAGE_KEY_COUNTER);

    return {
      nodes: nodesJson ? JSON.parse(nodesJson) : [],
      edges: edgesJson ? JSON.parse(edgesJson) : [],
      counter: counterStr ? parseInt(counterStr, 10) : 1,
    };
  } catch {
    return { nodes: [], edges: [], counter: 1 };
  }
}

export default function FlowEditor() {
  // Mobile detection: < 640px
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 640);
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      // Auto-close sidebar when switching to mobile, auto-open on desktop
      setSidebarOpen(!mobile);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Tooltip state for sidebar items (uses fixed positioning to escape overflow)
  const [activeTooltip, setActiveTooltip] = useState<{
    tooltip: TooltipInfo;
    x: number;
    y: number;
  } | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = (e: React.MouseEvent, tooltip: TooltipInfo) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    // 200ms delay before showing
    tooltipTimerRef.current = setTimeout(() => {
      setActiveTooltip({
        tooltip,
        x: rect.right + 8,
        y: rect.top + rect.height / 2,
      });
    }, 200);
  };

  const hideTooltip = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setActiveTooltip(null);
  };

  // Load initial state from localStorage
  const initialState = useRef(loadFromStorage());
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialState.current.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialState.current.edges);
  const nodeIdCounter = useRef(initialState.current.counter);
  // Store ReactFlow instance for coordinate conversion and fitView
  const reactFlowInstance = useRef<{
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    fitView: (options?: { maxZoom?: number; padding?: number }) => void;
  } | null>(null);
  // Track when we need to fitView (after loading a preset)
  const shouldFitView = useRef(false);

  // Dark mode state (persisted to localStorage)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("flow-ops-dark") === "true");
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      localStorage.setItem("flow-ops-dark", String(!prev));
      return !prev;
    });
  };

  // Theme colors based on dark mode
  const t = darkMode
    ? {
        bg: "#1a1a1a", sidebar: "#111", sidebarBorder: "#333", canvas: "#222",
        text: "#e5e5e5", textMuted: "#888", itemBg: "#2a2a2a", itemHover: "#333",
        sectionHead: "#777", presetBg: "#2a2a2a", presetHover: "#333",
        border: "#333", controlsBg: "#2a2a2a", controlsBorder: "#444",
        clearBg: "#2a2a2a", clearBorder: "#444", clearText: "#888",
        edgeStroke: "#555", gridColor: "#333", btnBg: "#333",
      }
    : {
        bg: "#fff", sidebar: "#fff", sidebarBorder: "#e5e5e5", canvas: "#fafafa",
        text: "#1d1d1f", textMuted: "#86868b", itemBg: "#f5f5f7", itemHover: "#e8e8ed",
        sectionHead: "#86868b", presetBg: "#f5f5f7", presetHover: "#e8e8ed",
        border: "#e5e5e5", controlsBg: "#fff", controlsBorder: "#e5e5e5",
        clearBg: "#fff", clearBorder: "#e5e5e5", clearText: "#86868b",
        edgeStroke: "#d1d1d6", gridColor: "#e5e5e5", btnBg: "#fff",
      };

  // Debug panel state
  const [debugOpen, setDebugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selfTestOpen, setSelfTestOpen] = useState(false);
  const [debugCount, setDebugCount] = useState(0);
  // Subscribe to debug log changes to update the badge count
  useEffect(() => {
    setDebugCount(getEntryCount());
    const unsubscribe = subscribeDebug(() => {
      setDebugCount(getEntryCount());
    });
    return unsubscribe;
  }, []);

  // Save to localStorage when nodes/edges change (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Debounce saves to avoid excessive writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(nodes));
        localStorage.setItem(STORAGE_KEY_EDGES, JSON.stringify(edges));
        localStorage.setItem(STORAGE_KEY_COUNTER, String(nodeIdCounter.current));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges]);

  // Clear canvas function. skipConfirm=true when called from chat.
  const clearCanvas = (skipConfirm = false) => {
    if (skipConfirm || nodes.length === 0 || confirm("Clear all nodes and connections?")) {
      setNodes([]);
      setEdges([]);
      nodesRef.current = [];
      edgesRef.current = [];
      nodeIdCounter.current = 1;
      localStorage.removeItem(STORAGE_KEY_NODES);
      localStorage.removeItem(STORAGE_KEY_EDGES);
      localStorage.removeItem(STORAGE_KEY_COUNTER);
    }
  };

  // Keep refs to current nodes/edges to avoid stale closures in callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Sync data along edges whenever nodes or edges change
  // This ensures that when you connect nodes after data exists, it flows through
  const prevEdgesRef = useRef<string>("");
  useEffect(() => {
    // Only run when edges actually change (not on every node change)
    const edgeKey = edges.map(e => `${e.source}-${e.target}`).join(",");
    if (edgeKey === prevEdgesRef.current) return;
    prevEdgesRef.current = edgeKey;

    // List of output fields to propagate
    const outputFields = [
      "value", "outputValue", "transcript", "summary", "articleText",
      "report", "copy", "landingPages", "concepts", "adCopy", "points",
      "headline", "content", "imageUrl", "videoUrl", "outputUrl", "audioUrl",
      "prompt", "title", "episodes",
    ];

    // For each edge, propagate data from source to target
    let updates: { nodeId: string; data: Record<string, unknown> }[] = [];

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) continue;

      const sourceData = sourceNode.data as Record<string, unknown>;
      const targetData = targetNode.data as Record<string, unknown>;
      const dataToPropagate: Record<string, unknown> = {};

      // Copy output fields that have values and aren't already in target
      for (const field of outputFields) {
        const val = sourceData[field];
        if (val !== undefined && val !== "" && val !== null) {
          // Only propagate if target doesn't have this value yet
          if (targetData[field] !== val) {
            dataToPropagate[field] = val;
          }
        }
      }

      // Set inputValue based on priority (generated outputs first, then inputs)
      // Priority: report/structured output > summary > outputValue > transcript > value > articleText
      if (sourceData.report) {
        // Report is a structured output, serialize it
        const reportJson = JSON.stringify(sourceData.report);
        if (targetData.inputValue !== reportJson) {
          dataToPropagate.inputValue = reportJson;
        }
      } else if (sourceData.summary && targetData.inputValue !== sourceData.summary) {
        dataToPropagate.inputValue = sourceData.summary;
      } else if (sourceData.outputValue && targetData.inputValue !== sourceData.outputValue) {
        dataToPropagate.inputValue = sourceData.outputValue;
      } else if (sourceData.transcript && targetData.inputValue !== sourceData.transcript) {
        dataToPropagate.inputValue = sourceData.transcript;
      } else if (sourceData.value && targetData.inputValue !== sourceData.value) {
        dataToPropagate.inputValue = sourceData.value;
      } else if (sourceData.articleText && targetData.inputValue !== sourceData.articleText) {
        dataToPropagate.inputValue = sourceData.articleText;
      }

      if (Object.keys(dataToPropagate).length > 0) {
        updates.push({ nodeId: edge.target, data: dataToPropagate });
      }
    }

    // Apply all updates
    if (updates.length > 0) {
      setNodes(nds => {
        let result = [...nds];
        for (const update of updates) {
          result = result.map(node =>
            node.id === update.nodeId
              ? { ...node, data: { ...node.data, ...update.data } }
              : node
          );
        }
        return result;
      });
    }
  }, [edges, nodes, setNodes]);

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

    // Schedule fitView after nodes are rendered
    shouldFitView.current = true;
  }, [nodes.length, setNodes, setEdges]);

  // FitView after loading a preset (runs when nodes change and flag is set)
  useEffect(() => {
    if (shouldFitView.current && nodes.length > 0 && reactFlowInstance.current) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ maxZoom: 1, padding: 0.1 });
        shouldFitView.current = false;
      }, 50);
    }
  }, [nodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Add the edge - the useEffect above will handle data propagation
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds));
    },
    [setEdges]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) => {
        const updated = nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        );
        // Sync ref immediately so onConnect can see latest data
        nodesRef.current = updated;
        return updated;
      });
    },
    [setNodes]
  );

  const propagateData = useCallback(
    (sourceId: string, value: string | Record<string, unknown>) => {
      // Use ref to always get current edges (avoids stale closure issue)
      const currentEdges = edgesRef.current;
      const outgoingEdges = currentEdges.filter((e) => e.source === sourceId);
      for (const edge of outgoingEdges) {
        // If value is an object, spread it onto the target node
        // If it's a string, set it as inputValue
        if (typeof value === "object" && value !== null) {
          updateNodeData(edge.target, { ...value, inputValue: JSON.stringify(value) });
        } else {
          updateNodeData(edge.target, { inputValue: value });
        }
      }
    },
    [updateNodeData]
  );

  const propagateOutput = useCallback(
    (sourceId: string, imageUrl: string, prompt: string) => {
      // Use ref to always get current edges (avoids stale closure issue)
      const currentEdges = edgesRef.current;
      const outgoingEdges = currentEdges.filter((e) => e.source === sourceId);
      for (const edge of outgoingEdges) {
        // Set both imageUrl/prompt for output nodes AND inputValue for chaining to other operations
        updateNodeData(edge.target, { imageUrl, prompt, inputValue: prompt });
      }
    },
    [updateNodeData]
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
      case "podcastRSS": return { feedUrl: "", audioUrl: "", title: "", episodes: [] };
      // Processing
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

      // Convert screen coordinates to flow coordinates (accounts for zoom/pan)
      let position = { x: 50, y: 150 }; // Default: left-middle of canvas
      if (reactFlowInstance.current) {
        position = reactFlowInstance.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
      }

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


  // Chat panel callback: batch-add nodes laid out left-to-right in flow order
  const chatAddNodes = useCallback(
    (
      newNodes: { nodeType: string; data: Record<string, unknown> }[]
    ): string[] => {
      const currentNodes = nodesRef.current;

      // Start position: to the right of existing nodes, or at the beginning
      const startX =
        currentNodes.length > 0
          ? Math.max(...currentNodes.map((n) => n.position.x)) + 350
          : 100;
      const startY = 200;
      const spacingX = 300; // horizontal gap between nodes in the flow

      const ids: string[] = [];
      const nodesToAdd: Node[] = [];

      newNodes.forEach((item, index) => {
        const id = `${item.nodeType}-${nodeIdCounter.current++}`;
        ids.push(id);

        const initialData = getInitialData(item.nodeType);
        const mergedData = { ...initialData, ...item.data };

        nodesToAdd.push({
          id,
          type: item.nodeType,
          position: { x: startX + index * spacingX, y: startY },
          data: mergedData,
        });
      });

      setNodes((nds) => [...nds, ...nodesToAdd]);
      // Update ref immediately so edges can find these nodes
      nodesRef.current = [...nodesRef.current, ...nodesToAdd];
      return ids;
    },
    [setNodes]
  );

  // Chat panel callback: add an edge between two nodes
  const chatAddEdge = useCallback(
    (sourceId: string, targetId: string) => {
      const edgeId = `e-${sourceId}-${targetId}`;
      setEdges((eds) => [
        ...eds,
        { id: edgeId, source: sourceId, target: targetId, type: "smoothstep" },
      ]);
    },
    [setEdges]
  );

  // Chat panel callback: load a preset by name
  const chatLoadPreset = useCallback(
    (presetName: string) => {
      const preset = presetFlows.find(
        (p) => p.name.toLowerCase() === presetName.toLowerCase()
      );
      if (preset) {
        loadPreset(preset);
      }
    },
    [loadPreset]
  );

  // Tap-to-add: on mobile, clicking a sidebar item adds it to the canvas center
  const tapToAddNode = useCallback(
    (nodeType: string) => {
      // Place node near center of the visible canvas
      let position = { x: 200, y: 200 };
      if (reactFlowInstance.current) {
        position = reactFlowInstance.current.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 3,
        });
      }
      const newNode: Node = {
        id: `${nodeType}-${nodeIdCounter.current++}`,
        type: nodeType,
        position,
        data: getInitialData(nodeType),
      };
      setNodes((nds) => [...nds, newNode]);
      // Auto-close sidebar after adding
      setSidebarOpen(false);
    },
    [setNodes]
  );

  // Renders a single sidebar item with a hover tooltip
  const renderSidebarItem = (item: SidebarItem) => (
    <div
      key={item.type}
      draggable={!isMobile}
      onDragStart={(e) => {
        if (isMobile) { e.preventDefault(); return; }
        onDragStart(e, item.type);
        hideTooltip(); // Hide tooltip when dragging starts
      }}
      onClick={() => {
        if (isMobile) tapToAddNode(item.type);
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.itemHover;
        if (!isMobile) showTooltip(e, item.tooltip);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = t.itemBg;
        hideTooltip();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 10px",
        background: t.itemBg,
        borderRadius: "10px",
        marginBottom: "4px",
        cursor: isMobile ? "pointer" : "grab",
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "6px",
          background: item.gradient || item.color || "#0071e3",
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
      <span style={{ fontSize: "12px", fontWeight: 500, color: t.text }}>{item.label}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
    {/* Top row: sidebar + canvas */}
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <style>{edgeStyles}</style>
      {/* Fixed-position tooltip portal, rendered outside sidebar overflow */}
      {activeTooltip && (
        <div
          className="sidebar-tooltip-portal"
          style={{
            left: activeTooltip.x,
            top: activeTooltip.y,
            transform: "translateY(-50%)",
          }}
        >
          <div className="tt-desc">{activeTooltip.tooltip.description}</div>
          <div className="tt-row">
            <span className="tt-label">In:</span>
            <span className="tt-value">{activeTooltip.tooltip.inputType}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Out:</span>
            <span className="tt-value">{activeTooltip.tooltip.outputType}</span>
          </div>
        </div>
      )}

      {/* Mobile hamburger toggle */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            position: "fixed",
            top: 10,
            left: 10,
            width: 40,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.btnBg,
            color: t.text,
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {sidebarOpen ? "\u2715" : "\u2630"}
        </button>
      )}

      {/* Mobile backdrop (closes sidebar when tapping outside) */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={
          isMobile
            ? {
                // Mobile: fixed overlay, completely hidden when closed
                display: sidebarOpen ? "flex" : "none",
                position: "fixed" as const,
                top: 0,
                left: 0,
                bottom: 0,
                width: "280px",
                zIndex: 1000,
                background: t.sidebar,
                flexDirection: "column" as const,
                overflowY: "auto" as const,
                paddingTop: "60px",
                padding: "60px 12px 16px 12px",
                boxShadow: "4px 0 20px rgba(0,0,0,0.2)",
              }
            : {
                // Desktop: always visible, fixed width
                width: "240px",
                minWidth: "240px",
                background: t.sidebar,
                borderRight: `1px solid ${t.sidebarBorder}`,
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column" as const,
                overflowY: "auto" as const,
              }
        }
      >
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.3px",
                margin: 0,
                color: t.text,
              }}
            >
              flow-ops
            </h1>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {nodes.length > 0 && (
              <button
                onClick={() => clearCanvas()}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${t.clearBorder}`,
                  background: t.clearBg,
                  color: t.clearText,
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#ff3b30";
                  e.currentTarget.style.color = "#ff3b30";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e5e5";
                  e.currentTarget.style.color = "#86868b";
                }}
              >
                Clear
              </button>
            )}
            </div>{/* end dark mode + clear buttons wrapper */}
          </div>
          <p style={{ fontSize: "13px", color: t.textMuted, margin: 0 }}>
            {isMobile ? "Tap to add nodes" : "Drag nodes to build"}
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.sectionHead,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Sources
          </h3>
          {sources.map(renderSidebarItem)}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.sectionHead,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Operations
          </h3>
          {operations.map(renderSidebarItem)}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.sectionHead,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            Outputs
          </h3>
          {outputs.map(renderSidebarItem)}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.sectionHead,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            Utilities
          </h3>
          {utilities.map(renderSidebarItem)}
        </div>

        <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: `1px solid ${t.border}` }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.sectionHead,
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
                  background: t.presetBg,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.presetHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = t.presetBg;
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 500, color: t.text }}>{preset.name}</span>
                <span style={{ fontSize: "11px", color: t.textMuted }}>{preset.description}</span>
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
          onInit={(instance) => {
            reactFlowInstance.current = instance as unknown as typeof reactFlowInstance.current;
          }}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.3}
          maxZoom={1.5}
          deleteKeyCode={["Delete", "Backspace"]}
          style={{ background: t.canvas }}
          defaultEdgeOptions={{
            style: { stroke: t.edgeStroke, strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            position="bottom-right"
            style={{ background: t.controlsBg, borderRadius: "12px", border: `1px solid ${t.controlsBorder}` }}
          />
          <Background color={t.gridColor} gap={24} size={1} />
        </ReactFlow>
      </div>

      </div>{/* end top row (sidebar + canvas) */}

      {/* Chat bar pinned to bottom */}
      <ChatPanel
        nodes={nodes}
        edges={edges}
        onAddNodes={chatAddNodes}
        onAddEdge={chatAddEdge}
        onLoadPreset={chatLoadPreset}
        onClearCanvas={clearCanvas}
        darkMode={darkMode}
        isMobile={isMobile}
      />

      {/* Settings gear (top-right) */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 998 }}>
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          title="Settings"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `1px solid ${t.border}`,
            background: settingsOpen ? (darkMode ? "#444" : "#e8e8ed") : t.btnBg,
            color: t.textMuted,
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            transition: "all 0.15s",
          }}
        >
          {/* Gear SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          {/* Debug badge on gear */}
          {debugCount > 0 && !settingsOpen && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                background: "#ef4444",
                borderRadius: 8,
                padding: "1px 4px",
                minWidth: 14,
                textAlign: "center",
                lineHeight: "14px",
              }}
            >
              {debugCount > 99 ? "99+" : debugCount}
            </span>
          )}
        </button>

        {/* Settings dropdown */}
        {settingsOpen && (
          <div
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              background: t.bg,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              padding: "4px",
              minWidth: 180,
            }}
          >
            {/* Dark mode */}
            <button
              onClick={() => { toggleDarkMode(); setSettingsOpen(false); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                color: t.text,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.itemHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{darkMode ? "\u2600" : "\u263D"}</span>
              {darkMode ? "Light mode" : "Dark mode"}
            </button>

            {/* Debug panel */}
            <button
              onClick={() => { setDebugOpen((o) => !o); setSettingsOpen(false); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                color: t.text,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.itemHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{debugOpen ? "\u2717" : "\u{1F41B}"}</span>
              {debugOpen ? "Close debug" : "Debug log"}
              {debugCount > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#ef4444", fontWeight: 600 }}>{debugCount}</span>
              )}
            </button>

            {/* Self-test */}
            <button
              onClick={() => { setSettingsOpen(false); setSelfTestOpen(true); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                color: t.text,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.itemHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{"\u2699"}</span>
              Run self-tests
            </button>
          </div>
        )}
      </div>

      {/* Close settings dropdown when clicking outside */}
      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 997 }}
        />
      )}

      {/* Debug panel (slides in from right) */}
      <DebugPanel isOpen={debugOpen} onClose={() => setDebugOpen(false)} />

      {/* Self-test runner (opened from settings menu) */}
      <SelfTest
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
        presetFlows={presetFlows}
        externalOpen={selfTestOpen}
        onClose={() => setSelfTestOpen(false)}
      />
    </div>
  );
}
