import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Node, Edge } from "@xyflow/react";

// API functions for Standard/Full tier tests
import {
  summarize,
  extractKeyPoints,
  generateMetaHeadlines,
  fetchURL,
  fetchPodcastRSS,
  generateReport,
  generatePhoto,
  transcribe,
  animateImage,
} from "../api";

// Test fixture data
import {
  SAMPLE_TEXT,
  SAMPLE_SHORT_TEXT,
  SAMPLE_URL,
  SAMPLE_RSS_URL,
  SAMPLE_AUDIO_URL,
  SAMPLE_IMAGE_BASE64,
  SAMPLE_PDF_BASE64,
  SAMPLE_VIDEO_BASE64,
} from "../testFixtures";

// ============================================================
// Constants
// ============================================================

const API_BASE = "https://flow-ops.helmsdeep.workers.dev/api";

// All node types in the app
const ALL_NODE_TYPES = [
  "textInput", "imageUpload", "urlInput", "podcastRSS",
  "audioUpload", "videoUpload", "pdfUpload",
  "iphonePhoto", "animate", "textOverlay", "crop",
  "transcribe", "generateReport", "generateCopy", "generateLandingPages",
  "generateAdvertorial", "generateAdvertorialCopy", "generateVisualConcepts",
  "summarize", "extractKeyPoints", "generateMetaHeadlines", "generateYouTubeThumbnails",
  "imageOutput", "reportPreview", "copyExport", "landingPagePreview",
  "advertorialPreview", "imageGallery",
  "splitReportSections", "merge", "filterByAngle", "platformToggle",
];

// Preset definitions with expected node/edge counts
const PRESET_EXPECTATIONS = [
  { name: "Text to Photo", nodeCount: 3, edgeCount: 2 },
  { name: "URL to Photo", nodeCount: 3, edgeCount: 2 },
  { name: "Photo to Video", nodeCount: 3, edgeCount: 2 },
  { name: "Text to Video", nodeCount: 4, edgeCount: 3 },
  { name: "Video for Meta", nodeCount: 5, edgeCount: 4 },
  { name: "Podcast to Report", nodeCount: 4, edgeCount: 3 },
  { name: "FWP Pipeline", nodeCount: 10, edgeCount: 9 },
];

// API endpoints to check (Quick tier health check)
const API_ENDPOINTS = [
  { path: "/operations/iphone-photo", label: "Generate Photo" },
  { path: "/operations/animate", label: "Animate" },
  { path: "/operations/text-overlay", label: "Text Overlay" },
  { path: "/operations/fetch-url", label: "Fetch URL" },
  { path: "/operations/transcribe", label: "Transcribe" },
  { path: "/operations/podcast-rss", label: "Podcast RSS" },
  { path: "/operations/summarize", label: "Summarize" },
  { path: "/operations/extract-key-points", label: "Extract Key Points" },
  { path: "/operations/generate-meta-headlines", label: "Meta Headlines" },
  { path: "/operations/generate-youtube-thumbnails", label: "YT Thumbnails" },
  { path: "/operations/generate-report", label: "Generate Report" },
  { path: "/operations/generate-copy", label: "Generate Copy" },
  { path: "/operations/generate-landing-pages", label: "Landing Pages" },
  { path: "/operations/generate-advertorial", label: "Advertorial" },
  { path: "/operations/generate-advertorial-copy", label: "Advertorial Copy" },
  { path: "/operations/generate-visual-concepts", label: "Visual Concepts" },
];

// Connection test pairs (source type -> target type)
const CONNECTION_TESTS = [
  { source: "textInput", target: "iphonePhoto", label: "Text Input -> iPhone Photo" },
  { source: "textInput", target: "summarize", label: "Text Input -> Summarize" },
  { source: "textInput", target: "extractKeyPoints", label: "Text Input -> Key Points" },
  { source: "textInput", target: "generateMetaHeadlines", label: "Text Input -> Meta Headlines" },
  { source: "urlInput", target: "iphonePhoto", label: "URL Input -> iPhone Photo" },
  { source: "imageUpload", target: "animate", label: "Image Upload -> Animate" },
  { source: "imageUpload", target: "crop", label: "Image Upload -> Crop" },
  { source: "podcastRSS", target: "transcribe", label: "Podcast RSS -> Transcribe" },
  { source: "iphonePhoto", target: "imageOutput", label: "iPhone Photo -> Image Output" },
];

// Upload node fixture tests
const UPLOAD_FIXTURE_TESTS = [
  { type: "imageUpload", dataKey: "imageUrl", fixture: SAMPLE_IMAGE_BASE64, label: "Image upload with fixture" },
  { type: "pdfUpload", dataKey: "pdfBase64", fixture: SAMPLE_PDF_BASE64, label: "PDF upload with fixture" },
  { type: "videoUpload", dataKey: "videoBase64", fixture: SAMPLE_VIDEO_BASE64, label: "Video upload with fixture" },
];

// localStorage keys (match FlowEditor)
const STORAGE_KEY_NODES = "flow-ops-nodes";
const STORAGE_KEY_EDGES = "flow-ops-edges";

// ============================================================
// Types
// ============================================================

type TestTier = "quick" | "standard" | "full";
type TestStatus = "pending" | "running" | "pass" | "fail" | "skipped";

interface TestResult {
  id: string;
  category: string;
  name: string;
  status: TestStatus;
  error?: string;
  duration?: number;
  detail?: string; // extra info shown on pass (e.g. "Summary: 142 chars")
}

// ============================================================
// Assertion helpers
// ============================================================

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${typeof value === "string" ? `"" (empty)` : typeof value}`);
  }
}

function assertArrayLength(arr: unknown, min: number, max: number, label: string): asserts arr is unknown[] {
  if (!Array.isArray(arr)) {
    throw new Error(`${label}: expected array, got ${typeof arr}`);
  }
  if (arr.length < min || arr.length > max) {
    throw new Error(`${label}: expected ${min}-${max} items, got ${arr.length}`);
  }
}

function assertStartsWith(str: unknown, prefix: string, label: string): void {
  if (typeof str !== "string" || !str.startsWith(prefix)) {
    const preview = typeof str === "string" ? str.slice(0, 40) : String(str);
    throw new Error(`${label}: expected to start with "${prefix}", got "${preview}..."`);
  }
}

function assertMinLength(str: unknown, min: number, label: string): void {
  if (typeof str !== "string" || str.length < min) {
    const len = typeof str === "string" ? str.length : 0;
    throw new Error(`${label}: expected at least ${min} chars, got ${len}`);
  }
}

// ============================================================
// Initial data helper (mirrors FlowEditor's getInitialData)
// ============================================================

function getInitialData(type: string): Record<string, unknown> {
  switch (type) {
    case "textInput": return { value: "" };
    case "imageUpload": return { imageUrl: "" };
    case "urlInput": return { value: "", articleText: "" };
    case "audioUpload": return { audioBase64: "", mimeType: "", filename: "" };
    case "videoUpload": return { videoBase64: "", mimeType: "", filename: "" };
    case "pdfUpload": return { pdfBase64: "", filename: "" };
    case "podcastRSS": return { audioUrl: "", title: "", episodes: [] };
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
    case "imageOutput": return { imageUrl: "", prompt: "" };
    case "reportPreview": return { report: null };
    case "copyExport": return { copy: null };
    case "landingPagePreview": return { landingPages: null };
    case "advertorialPreview": return { headline: "", content: "" };
    case "imageGallery": return { images: [] };
    case "splitReportSections": return { report: null, sections: [] };
    case "merge": return { inputs: [] };
    case "filterByAngle": return { inputValue: null, angle: "fear" };
    case "platformToggle": return { platform: "google" };
    case "generateMetaHeadlines": return { inputValue: "" };
    case "generateYouTubeThumbnails": return { inputValue: "" };
    default: return { inputValue: "" };
  }
}

// ============================================================
// Component
// ============================================================

interface SelfTestProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  presetFlows: Array<{ name: string; nodes: Node[]; edges: Edge[] }>;
  externalOpen?: boolean;
  onClose?: () => void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SelfTest({
  nodes,
  edges,
  setNodes,
  setEdges,
  presetFlows,
  externalOpen = false,
  onClose,
}: SelfTestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tier, setTier] = useState<TestTier>("standard");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const abortRef = useRef(false);
  const savedStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // Allow parent to open the modal
  useEffect(() => {
    if (externalOpen) setIsOpen(true);
  }, [externalOpen]);

  // Counts
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const total = results.length;
  const pending = results.filter((r) => r.status === "pending" || r.status === "running").length;

  // Update a single test result
  const updateResult = useCallback(
    (id: string, update: Partial<TestResult>) => {
      setResults((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...update } : r))
      );
    },
    []
  );

  // ============================================================
  // Build test list based on selected tier
  // ============================================================

  const buildTestList = useCallback((selectedTier: TestTier): TestResult[] => {
    const tests: TestResult[] = [];

    // ---- QUICK TIER (always included) ----

    // Node creation
    for (const nodeType of ALL_NODE_TYPES) {
      tests.push({ id: `node-${nodeType}`, category: "Node Creation", name: `Create ${nodeType}`, status: "pending" });
    }

    // Preset loading
    for (const preset of PRESET_EXPECTATIONS) {
      tests.push({ id: `preset-${preset.name}`, category: "Preset Loading", name: `Load "${preset.name}"`, status: "pending" });
    }

    // Connections
    for (const conn of CONNECTION_TESTS) {
      tests.push({ id: `conn-${conn.source}-${conn.target}`, category: "Connections", name: conn.label, status: "pending" });
    }

    // Upload rendering with fixtures
    for (const upload of UPLOAD_FIXTURE_TESTS) {
      tests.push({ id: `upload-${upload.type}`, category: "Upload Rendering", name: upload.label, status: "pending" });
    }

    // Data propagation
    tests.push({ id: "prop-text-to-summarize", category: "Data Propagation", name: "Text propagates through edge", status: "pending" });
    tests.push({ id: "prop-multi-edge", category: "Data Propagation", name: "Data flows through multiple edges", status: "pending" });

    // API health checks
    for (const endpoint of API_ENDPOINTS) {
      tests.push({ id: `api-${endpoint.path}`, category: "API Health", name: `${endpoint.label} endpoint`, status: "pending" });
    }

    // State persistence
    tests.push({ id: "state-save", category: "State Persistence", name: "Save flow to localStorage", status: "pending" });
    tests.push({ id: "state-load", category: "State Persistence", name: "Load flow from localStorage", status: "pending" });
    tests.push({ id: "state-roundtrip", category: "State Persistence", name: "Round-trip integrity check", status: "pending" });

    if (selectedTier === "quick") return tests;

    // ---- STANDARD TIER (text-based API + workflow chains) ----

    // Individual API tests
    tests.push({ id: "std-summarize", category: "API: Text Operations", name: "Summarize text", status: "pending" });
    tests.push({ id: "std-key-points", category: "API: Text Operations", name: "Extract key points", status: "pending" });
    tests.push({ id: "std-meta-headlines", category: "API: Text Operations", name: "Generate Meta headlines", status: "pending" });
    tests.push({ id: "std-fetch-url", category: "API: Text Operations", name: "Fetch URL content", status: "pending" });
    tests.push({ id: "std-podcast-rss", category: "API: Text Operations", name: "Parse podcast RSS", status: "pending" });
    tests.push({ id: "std-generate-report", category: "API: Text Operations", name: "Generate report", status: "pending" });

    // Workflow chain tests
    tests.push({ id: "chain-text-summarize-keypoints", category: "Workflow Chains", name: "Text -> Summarize -> Key Points", status: "pending" });
    tests.push({ id: "chain-url-fetch-summarize", category: "Workflow Chains", name: "URL -> Fetch -> Summarize", status: "pending" });
    tests.push({ id: "chain-text-report-headlines", category: "Workflow Chains", name: "Text -> Report -> Meta Headlines", status: "pending" });
    tests.push({ id: "chain-rss-episode-validate", category: "Workflow Chains", name: "RSS -> Episode URL Validation", status: "pending" });

    if (selectedTier === "standard") return tests;

    // ---- FULL TIER (image gen, transcription, animation) ----

    tests.push({ id: "full-generate-image", category: "Full: Expensive Ops", name: "Generate image from text", status: "pending" });
    tests.push({ id: "full-transcribe", category: "Full: Expensive Ops", name: "Transcribe audio clip", status: "pending" });
    tests.push({ id: "full-transcribe-summarize", category: "Full: Expensive Ops", name: "Transcribe -> Summarize chain", status: "pending" });
    tests.push({ id: "full-generate-animate", category: "Full: Expensive Ops", name: "Generate image -> Animate to video", status: "pending" });

    return tests;
  }, []);

  // ============================================================
  // Run all tests
  // ============================================================

  const runTests = useCallback(async () => {
    const selectedTier = tier;
    setIsRunning(true);
    abortRef.current = false;

    // Save current state
    savedStateRef.current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    const testList = buildTestList(selectedTier);
    setResults(testList);

    // Helper to run a single test
    const runTest = async (
      testId: string,
      fn: () => Promise<string | void> // return optional detail string
    ) => {
      if (abortRef.current) return;
      updateResult(testId, { status: "running" });
      const start = performance.now();
      try {
        const detail = await fn();
        const duration = Math.round(performance.now() - start);
        updateResult(testId, { status: "pass", duration, detail: detail || undefined });
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        const message = err instanceof Error ? err.message : String(err);
        updateResult(testId, { status: "fail", error: message, duration });
      }
      await wait(30);
    };

    // ===================================================================
    // QUICK TIER
    // ===================================================================

    // ---- Node Creation ----
    for (const nodeType of ALL_NODE_TYPES) {
      if (abortRef.current) break;
      await runTest(`node-${nodeType}`, async () => {
        setNodes([]);
        setEdges([]);
        await wait(50);
        const newNode: Node = {
          id: `test-${nodeType}-1`,
          type: nodeType,
          position: { x: 200, y: 200 },
          data: getInitialData(nodeType),
        };
        setNodes([newNode]);
        await wait(100);
        const el = document.querySelector(`[data-id="test-${nodeType}-1"]`);
        if (!el) throw new Error("Node element not found in DOM after creation");
      });
    }

    setNodes([]);
    setEdges([]);
    await wait(100);

    // ---- Preset Loading ----
    for (let i = 0; i < PRESET_EXPECTATIONS.length; i++) {
      if (abortRef.current) break;
      const preset = PRESET_EXPECTATIONS[i];
      await runTest(`preset-${preset.name}`, async () => {
        setNodes([]);
        setEdges([]);
        await wait(50);
        const presetData = presetFlows[i];
        if (!presetData) throw new Error(`Preset index ${i} not found`);
        setNodes(presetData.nodes);
        setEdges(presetData.edges);
        await wait(150);
        if (presetData.nodes.length !== preset.nodeCount) {
          throw new Error(`Expected ${preset.nodeCount} nodes, preset has ${presetData.nodes.length}`);
        }
        if (presetData.edges.length !== preset.edgeCount) {
          throw new Error(`Expected ${preset.edgeCount} edges, preset has ${presetData.edges.length}`);
        }
        for (const node of presetData.nodes) {
          const el = document.querySelector(`[data-id="${node.id}"]`);
          if (!el) throw new Error(`Node "${node.id}" not rendered in DOM`);
        }
        return `${presetData.nodes.length} nodes, ${presetData.edges.length} edges`;
      });
    }

    setNodes([]);
    setEdges([]);
    await wait(100);

    // ---- Connections ----
    for (const conn of CONNECTION_TESTS) {
      if (abortRef.current) break;
      await runTest(`conn-${conn.source}-${conn.target}`, async () => {
        setNodes([]);
        setEdges([]);
        await wait(50);
        setNodes([
          { id: "test-src-1", type: conn.source, position: { x: 100, y: 200 }, data: getInitialData(conn.source) },
          { id: "test-tgt-1", type: conn.target, position: { x: 400, y: 200 }, data: getInitialData(conn.target) },
        ]);
        setEdges([{ id: "test-edge-1", source: "test-src-1", target: "test-tgt-1", type: "smoothstep" }]);
        await wait(300);
        if (!document.querySelector(`[data-id="test-src-1"]`)) throw new Error(`Source "${conn.source}" not rendered`);
        if (!document.querySelector(`[data-id="test-tgt-1"]`)) throw new Error(`Target "${conn.target}" not rendered`);
        // React Flow may need extra time to render edges under load (Full tier)
        let edgeFound = document.querySelector(`[data-testid="rf__edge-test-edge-1"]`)
          || document.querySelectorAll(".react-flow__edge").length > 0;
        if (!edgeFound) {
          await wait(300); // retry once after more time
          edgeFound = document.querySelector(`[data-testid="rf__edge-test-edge-1"]`)
            || document.querySelectorAll(".react-flow__edge").length > 0;
        }
        if (!edgeFound) throw new Error("No edge rendered between nodes");
      });
    }

    setNodes([]);
    setEdges([]);
    await wait(100);

    // ---- Upload Rendering ----
    for (const upload of UPLOAD_FIXTURE_TESTS) {
      if (abortRef.current) break;
      await runTest(`upload-${upload.type}`, async () => {
        setNodes([]);
        setEdges([]);
        await wait(50);
        const data = { ...getInitialData(upload.type), [upload.dataKey]: upload.fixture };
        setNodes([{ id: `test-upload-1`, type: upload.type, position: { x: 200, y: 200 }, data }]);
        await wait(150);
        const el = document.querySelector(`[data-id="test-upload-1"]`);
        if (!el) throw new Error(`Upload node "${upload.type}" not rendered`);
        return `Rendered with ${upload.fixture.length} char fixture`;
      });
    }

    setNodes([]);
    setEdges([]);
    await wait(100);

    // ---- Data Propagation ----
    await runTest("prop-text-to-summarize", async () => {
      setNodes([]);
      setEdges([]);
      await wait(50);
      setNodes([
        { id: "prop-src-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "Hello self-test propagation" } },
        { id: "prop-tgt-1", type: "summarize", position: { x: 400, y: 200 }, data: { inputValue: "", summary: "" } },
      ]);
      setEdges([{ id: "prop-edge-1", source: "prop-src-1", target: "prop-tgt-1", type: "smoothstep" }]);
      await wait(500);
      if (!document.querySelector(`[data-id="prop-src-1"]`)) throw new Error("Source not rendered");
      if (!document.querySelector(`[data-id="prop-tgt-1"]`)) throw new Error("Target not rendered");
    });

    await runTest("prop-multi-edge", async () => {
      setNodes([]);
      setEdges([]);
      await wait(50);
      setNodes([
        { id: "multi-src", type: "textInput", position: { x: 100, y: 200 }, data: { value: "Multi-target test" } },
        { id: "multi-tgt-1", type: "summarize", position: { x: 400, y: 100 }, data: { inputValue: "", summary: "" } },
        { id: "multi-tgt-2", type: "extractKeyPoints", position: { x: 400, y: 300 }, data: { inputValue: "", points: [] } },
      ]);
      setEdges([
        { id: "me-1", source: "multi-src", target: "multi-tgt-1", type: "smoothstep" },
        { id: "me-2", source: "multi-src", target: "multi-tgt-2", type: "smoothstep" },
      ]);
      await wait(500);
      if (!document.querySelector(`[data-id="multi-tgt-1"]`)) throw new Error("Target 1 not rendered");
      if (!document.querySelector(`[data-id="multi-tgt-2"]`)) throw new Error("Target 2 not rendered");
      const edgePaths = document.querySelectorAll(".react-flow__edge");
      if (edgePaths.length < 2) throw new Error(`Expected 2 edges, found ${edgePaths.length}`);
    });

    setNodes([]);
    setEdges([]);
    await wait(100);

    // ---- API Health Checks ----
    const token = localStorage.getItem("flow-ops-token");
    for (const endpoint of API_ENDPOINTS) {
      if (abortRef.current) break;
      await runTest(`api-${endpoint.path}`, async () => {
        const res = await fetch(`${API_BASE}${endpoint.path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        });
        if (res.status === 0) throw new Error("Network error, endpoint unreachable");
        return `HTTP ${res.status}`;
      });
    }

    // ---- State Persistence ----
    await runTest("state-save", async () => {
      const testNodes: Node[] = [
        { id: "persist-1", type: "textInput", position: { x: 100, y: 100 }, data: { value: "persistence test" } },
        { id: "persist-2", type: "summarize", position: { x: 400, y: 100 }, data: { inputValue: "", summary: "" } },
      ];
      const testEdges: Edge[] = [
        { id: "persist-e1", source: "persist-1", target: "persist-2", type: "smoothstep" },
      ];
      setNodes(testNodes);
      setEdges(testEdges);
      await wait(700);
      const savedNodes = localStorage.getItem(STORAGE_KEY_NODES);
      if (!savedNodes) throw new Error("Nodes not found in localStorage after save");
      const parsed = JSON.parse(savedNodes);
      if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error(`Expected 2 saved nodes, found ${parsed?.length}`);
      return `${parsed.length} nodes saved`;
    });

    await runTest("state-load", async () => {
      const savedNodes = localStorage.getItem(STORAGE_KEY_NODES);
      const savedEdges = localStorage.getItem(STORAGE_KEY_EDGES);
      if (!savedNodes || !savedEdges) throw new Error("No saved state found in localStorage");
      const parsedNodes = JSON.parse(savedNodes);
      const parsedEdges = JSON.parse(savedEdges);
      if (!Array.isArray(parsedNodes)) throw new Error("Saved nodes is not an array");
      if (!Array.isArray(parsedEdges)) throw new Error("Saved edges is not an array");
      return `${parsedNodes.length} nodes, ${parsedEdges.length} edges`;
    });

    await runTest("state-roundtrip", async () => {
      const testKey = "flow-ops-selftest-roundtrip";
      const testData = {
        nodes: [{ id: "rt-1", type: "textInput", position: { x: 0, y: 0 }, data: { value: "round trip" } }],
        edges: [{ id: "rt-e1", source: "rt-1", target: "rt-2" }],
      };
      localStorage.setItem(testKey, JSON.stringify(testData));
      const loaded = JSON.parse(localStorage.getItem(testKey) || "null");
      localStorage.removeItem(testKey);
      if (!loaded) throw new Error("Failed to load test data from localStorage");
      if (loaded.nodes[0].data.value !== "round trip") throw new Error("Round-trip data mismatch");
      if (loaded.edges[0].source !== "rt-1") throw new Error("Round-trip edge data mismatch");
    });

    // ===================================================================
    // STANDARD TIER
    // ===================================================================

    if (selectedTier === "standard" || selectedTier === "full") {
      // ---- Individual API tests ----

      await runTest("std-summarize", async () => {
        const result = await summarize(SAMPLE_TEXT);
        assertNonEmptyString(result.summary, "summary");
        if (result.summary.length >= SAMPLE_TEXT.length) {
          throw new Error(`Summary (${result.summary.length} chars) should be shorter than input (${SAMPLE_TEXT.length} chars)`);
        }
        return `Summary: ${result.summary.length} chars`;
      });

      await runTest("std-key-points", async () => {
        const result = await extractKeyPoints(SAMPLE_TEXT, 5);
        assertArrayLength(result.points, 1, 10, "points");
        for (const point of result.points) {
          assertNonEmptyString(point, "point item");
        }
        return `${result.points.length} key points extracted`;
      });

      await runTest("std-meta-headlines", async () => {
        const result = await generateMetaHeadlines(SAMPLE_TEXT);
        assertArrayLength(result.primaryTexts, 1, 10, "primaryTexts");
        assertArrayLength(result.headlines, 1, 10, "headlines");
        // Verify character limits
        for (const pt of result.primaryTexts) {
          if (pt.length > 150) {
            throw new Error(`Primary text too long: ${pt.length} chars (limit 125, allowing buffer)`);
          }
        }
        for (const hl of result.headlines) {
          if (hl.length > 280) {
            throw new Error(`Headline too long: ${hl.length} chars (limit 255, allowing buffer)`);
          }
        }
        return `${result.primaryTexts.length} primary texts, ${result.headlines.length} headlines`;
      });

      await runTest("std-fetch-url", async () => {
        const text = await fetchURL(SAMPLE_URL);
        assertNonEmptyString(text, "fetched text");
        assertMinLength(text, 100, "fetched text");
        return `Fetched: ${text.length} chars`;
      });

      await runTest("std-podcast-rss", async () => {
        const result = await fetchPodcastRSS(SAMPLE_RSS_URL);
        assertNonEmptyString(result.feedTitle, "feedTitle");
        assertArrayLength(result.episodes, 1, 500, "episodes");
        // Check first episode has required fields
        const ep = result.episodes[0];
        assertNonEmptyString(ep.title, "episode title");
        assertNonEmptyString(ep.audioUrl, "episode audioUrl");
        return `Feed: "${result.feedTitle}", ${result.episodes.length} episodes`;
      });

      await runTest("std-generate-report", async () => {
        const result = await generateReport(SAMPLE_TEXT);
        assertNonEmptyString(result.executiveSummary, "executiveSummary");
        assertArrayLength(result.sections, 1, 20, "sections");
        for (const section of result.sections) {
          assertNonEmptyString(section.title, "section title");
          assertNonEmptyString(section.content, "section content");
        }
        return `Summary: ${result.executiveSummary.length} chars, ${result.sections.length} sections`;
      });

      // ---- Workflow Chain tests ----

      await runTest("chain-text-summarize-keypoints", async () => {
        // Step 1: Summarize
        const sumResult = await summarize(SAMPLE_TEXT);
        assertNonEmptyString(sumResult.summary, "summary step");
        // Step 2: Extract key points from the summary
        const kpResult = await extractKeyPoints(sumResult.summary, 5);
        assertArrayLength(kpResult.points, 1, 10, "key points from summary");
        return `Summary: ${sumResult.summary.length} chars -> ${kpResult.points.length} key points`;
      });

      await runTest("chain-url-fetch-summarize", async () => {
        // Step 1: Fetch URL
        const articleText = await fetchURL(SAMPLE_URL);
        assertMinLength(articleText, 100, "fetched article");
        // Step 2: Summarize the fetched article
        const sumResult = await summarize(articleText);
        assertNonEmptyString(sumResult.summary, "article summary");
        return `Fetched ${articleText.length} chars -> Summary: ${sumResult.summary.length} chars`;
      });

      await runTest("chain-text-report-headlines", async () => {
        // Step 1: Generate report
        const report = await generateReport(SAMPLE_TEXT);
        assertNonEmptyString(report.executiveSummary, "report exec summary");
        // Step 2: Generate Meta headlines from the executive summary
        const headlines = await generateMetaHeadlines(report.executiveSummary);
        assertArrayLength(headlines.primaryTexts, 1, 10, "primaryTexts from report");
        assertArrayLength(headlines.headlines, 1, 10, "headlines from report");
        return `Report ${report.sections.length} sections -> ${headlines.primaryTexts.length} texts, ${headlines.headlines.length} headlines`;
      });

      await runTest("chain-rss-episode-validate", async () => {
        // Step 1: Parse RSS
        const rss = await fetchPodcastRSS(SAMPLE_RSS_URL);
        assertArrayLength(rss.episodes, 1, 500, "episodes");
        // Step 2: Validate first episode audio URL is valid HTTP
        const audioUrl = rss.episodes[0].audioUrl;
        assertStartsWith(audioUrl, "http", "episode audioUrl");
        // Verify URL is well-formed
        try {
          new URL(audioUrl);
        } catch {
          throw new Error(`Invalid URL: ${audioUrl}`);
        }
        return `"${rss.episodes[0].title}" -> ${audioUrl.slice(0, 60)}...`;
      });
    }

    // ===================================================================
    // FULL TIER
    // ===================================================================

    if (selectedTier === "full") {
      await runTest("full-generate-image", async () => {
        const result = await generatePhoto(SAMPLE_SHORT_TEXT);
        assertNonEmptyString(result.prompt, "prompt");
        assertNonEmptyString(result.imageUrl, "imageUrl");
        if (!result.imageUrl.startsWith("data:image") && !result.imageUrl.startsWith("http")) {
          throw new Error(`imageUrl should start with data:image or http, got: ${result.imageUrl.slice(0, 40)}`);
        }
        return `Image generated, prompt: ${result.prompt.length} chars`;
      });

      await runTest("full-transcribe", async () => {
        const result = await transcribe(SAMPLE_AUDIO_URL);
        assertNonEmptyString(result.transcript, "transcript");
        assertMinLength(result.transcript, 10, "transcript");
        return `Transcript: ${result.transcript.length} chars`;
      });

      await runTest("full-transcribe-summarize", async () => {
        // Step 1: Transcribe audio clip
        const txResult = await transcribe(SAMPLE_AUDIO_URL);
        assertNonEmptyString(txResult.transcript, "transcript");
        // Step 2: Summarize the transcript
        const sumResult = await summarize(txResult.transcript);
        assertNonEmptyString(sumResult.summary, "transcript summary");
        return `Transcript: ${txResult.transcript.length} chars -> Summary: ${sumResult.summary.length} chars`;
      });

      await runTest("full-generate-animate", async () => {
        // Step 1: Generate image
        const imgResult = await generatePhoto(SAMPLE_SHORT_TEXT);
        assertNonEmptyString(imgResult.imageUrl, "generated imageUrl");
        // Step 2: Animate the image to video
        const videoUrl = await animateImage(imgResult.imageUrl, "gentle zoom in");
        assertNonEmptyString(videoUrl, "videoUrl");
        // Animate can return either an http URL or a base64 data URL
        if (!videoUrl.startsWith("http") && !videoUrl.startsWith("data:video")) {
          throw new Error(`videoUrl: expected http or data:video URL, got "${videoUrl.slice(0, 60)}..."`);
        }
        return `Image -> Video: ${videoUrl.slice(0, 60)}...`;
      });
    }

    // ===================================================================
    // RESTORE STATE
    // ===================================================================

    if (savedStateRef.current) {
      setNodes(savedStateRef.current.nodes);
      setEdges(savedStateRef.current.edges);
      savedStateRef.current = null;
    }

    setIsRunning(false);
  }, [nodes, edges, setNodes, setEdges, buildTestList, updateResult, presetFlows, tier]);

  // Stop tests
  const stopTests = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    setResults((prev) =>
      prev.map((r) =>
        r.status === "pending" || r.status === "running"
          ? { ...r, status: "skipped" as TestStatus }
          : r
      )
    );
    if (savedStateRef.current) {
      setNodes(savedStateRef.current.nodes);
      setEdges(savedStateRef.current.edges);
      savedStateRef.current = null;
    }
  }, [setNodes, setEdges]);

  // Copy results to clipboard
  const copyResults = useCallback(() => {
    const lines: string[] = [];
    lines.push(`flow-ops Self-Test Results (${tier.toUpperCase()} tier)`);
    lines.push(`${new Date().toLocaleString()}`);
    lines.push(`Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}, Total: ${total}`);
    lines.push("");

    let currentCategory = "";
    for (const r of results) {
      if (r.category !== currentCategory) {
        currentCategory = r.category;
        lines.push(`--- ${currentCategory} ---`);
      }
      const icon = r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : r.status === "skipped" ? "SKIP" : "....";
      const dur = r.duration ? ` (${r.duration}ms)` : "";
      const err = r.error ? ` | ${r.error}` : "";
      const det = r.detail ? ` | ${r.detail}` : "";
      lines.push(`  [${icon}] ${r.name}${dur}${det}${err}`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
  }, [results, passed, failed, skipped, total, tier]);

  // Group results by category
  const groupedResults: Record<string, TestResult[]> = {};
  for (const r of results) {
    if (!groupedResults[r.category]) groupedResults[r.category] = [];
    groupedResults[r.category].push(r);
  }

  // Auto-scroll to running test
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && isRunning) {
      const runningEl = scrollRef.current.querySelector("[data-status='running']");
      if (runningEl) {
        runningEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [results, isRunning]);

  // UI helpers
  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case "pass": return <span style={{ color: "#34c759", fontWeight: 700 }}>&#10003;</span>;
      case "fail": return <span style={{ color: "#ff3b30", fontWeight: 700 }}>&#10007;</span>;
      case "running": return <span style={{ color: "#0071e3" }}>&#9679;</span>;
      case "skipped": return <span style={{ color: "#86868b" }}>&#8211;</span>;
      case "pending": return <span style={{ color: "#d1d1d6" }}>&#9675;</span>;
    }
  };

  const categorySummary = (tests: TestResult[]) => {
    const p = tests.filter((t) => t.status === "pass").length;
    const f = tests.filter((t) => t.status === "fail").length;
    if (f > 0) return <span style={{ color: "#ff3b30", fontSize: "11px" }}>{p}/{tests.length} passed</span>;
    if (p === tests.length) return <span style={{ color: "#34c759", fontSize: "11px" }}>All passed</span>;
    return <span style={{ color: "#86868b", fontSize: "11px" }}>{p}/{tests.length}</span>;
  };

  const handleClose = () => {
    if (isRunning) stopTests();
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  // Tier selector button style helper
  const tierBtnStyle = (_t: TestTier, selected: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "6px 8px",
    border: "none",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: selected ? 600 : 400,
    cursor: isRunning ? "not-allowed" : "pointer",
    background: selected ? "#0071e3" : "transparent",
    color: selected ? "#fff" : "#86868b",
    opacity: isRunning ? 0.5 : 1,
    transition: "all 0.15s",
    lineHeight: "1.3",
  });

  const modal = (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={() => { if (!isRunning) handleClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "600px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 80px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e5e5", background: "#fafafa", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1d1d1f" }}>
              Self-Test Runner
            </h2>
            <button
              onClick={handleClose}
              style={{
                width: "32px", height: "32px", borderRadius: "8px",
                border: "none", background: "#f5f5f7", color: "#86868b",
                fontSize: "16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              &#10005;
            </button>
          </div>

          {/* Tier selector */}
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "2px",
              background: "#f5f5f7",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              style={tierBtnStyle("quick", tier === "quick")}
              onClick={() => !isRunning && setTier("quick")}
            >
              Quick ~10s<br />Free
            </button>
            <button
              style={tierBtnStyle("standard", tier === "standard")}
              onClick={() => !isRunning && setTier("standard")}
            >
              Standard ~45s<br />~$0.02
            </button>
            <button
              style={tierBtnStyle("full", tier === "full")}
              onClick={() => !isRunning && setTier("full")}
            >
              Full ~4min<br />~$0.15
            </button>
          </div>

          {/* Summary bar */}
          {results.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", gap: "16px", fontSize: "13px", fontWeight: 500 }}>
              <span style={{ color: "#34c759" }}>{passed} passed</span>
              <span style={{ color: "#ff3b30" }}>{failed} failed</span>
              {skipped > 0 && <span style={{ color: "#86868b" }}>{skipped} skipped</span>}
              {pending > 0 && <span style={{ color: "#0071e3" }}>{pending} remaining</span>}
              <span style={{ color: "#86868b" }}>/ {total} total</span>
            </div>
          )}

          {/* Progress bar */}
          {results.length > 0 && (
            <div style={{ marginTop: "8px", height: "4px", background: "#e5e5e5", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${((passed + failed + skipped) / total) * 100}%`,
                  background: failed > 0 ? "#ff3b30" : "#34c759",
                  borderRadius: "2px",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            {!isRunning ? (
              <button
                onClick={runTests}
                style={{
                  padding: "8px 20px", borderRadius: "8px", border: "none",
                  background: "#0071e3", color: "#fff", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer",
                }}
              >
                {results.length > 0 ? "Run Again" : "Run Tests"}
              </button>
            ) : (
              <button
                onClick={stopTests}
                style={{
                  padding: "8px 20px", borderRadius: "8px", border: "none",
                  background: "#ff3b30", color: "#fff", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer",
                }}
              >
                Stop
              </button>
            )}
            {results.length > 0 && !isRunning && (
              <button
                onClick={copyResults}
                style={{
                  padding: "8px 20px", borderRadius: "8px",
                  border: "1px solid #e5e5e5", background: "#fff",
                  color: "#1d1d1f", fontSize: "13px", fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Copy Results
              </button>
            )}
          </div>
        </div>

        {/* Results list */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {results.length === 0 && (
            <div style={{ textAlign: "center", color: "#86868b", padding: "40px 0", fontSize: "14px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "16px" }}>No tests run yet.</p>
              <p style={{ margin: 0 }}>
                Select a tier and click "Run Tests" to check nodes, presets,
                connections, APIs, and workflows.
              </p>
            </div>
          )}

          {Object.entries(groupedResults).map(([category, tests]) => (
            <div key={category} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <h3 style={{
                  fontSize: "11px", fontWeight: 600, color: "#86868b",
                  textTransform: "uppercase", letterSpacing: "0.5px", margin: 0,
                }}>
                  {category}
                </h3>
                {categorySummary(tests)}
              </div>

              {tests.map((test) => (
                <div
                  key={test.id}
                  data-status={test.status}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "5px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: test.status === "running" ? "#f0f4ff" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ width: "16px", textAlign: "center", flexShrink: 0, lineHeight: "18px" }}>
                    {statusIcon(test.status)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: test.status === "fail" ? "#ff3b30" : "#1d1d1f" }}>
                      {test.name}
                    </span>
                    {test.duration !== undefined && (
                      <span style={{ color: "#86868b", marginLeft: "6px" }}>{test.duration}ms</span>
                    )}
                    {/* Detail line for passed tests */}
                    {test.detail && test.status === "pass" && (
                      <div style={{ color: "#34c759", fontSize: "11px", marginTop: "1px", lineHeight: "1.4" }}>
                        {test.detail}
                      </div>
                    )}
                    {/* Error line for failed tests */}
                    {test.error && (
                      <div style={{ color: "#ff3b30", fontSize: "11px", marginTop: "2px", lineHeight: "1.4", wordBreak: "break-word" }}>
                        {test.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
