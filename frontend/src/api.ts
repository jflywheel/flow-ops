// API client for flow-ops backend
// All API calls are automatically logged to the debug panel

import { addEntry, extractModelFromRequest } from "./debugLog";

const API_BASE = "https://flow-ops.helmsdeep.workers.dev/api";

function getToken(): string | null {
  return localStorage.getItem("flow-ops-token");
}

function setToken(token: string): void {
  localStorage.setItem("flow-ops-token", token);
}

function clearToken(): void {
  localStorage.removeItem("flow-ops-token");
}

// Truncate base64 data in request/response bodies so debug logs stay readable.
// Replaces long data:... strings with a placeholder showing size.
function sanitizeForLog(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Truncate base64 data URLs
    if (obj.startsWith("data:") && obj.length > 200) {
      const mimeMatch = obj.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : "unknown";
      return `[base64 ${mime}, ${(obj.length / 1024).toFixed(0)}KB]`;
    }
    // Truncate any very long string
    if (obj.length > 2000) {
      return obj.slice(0, 2000) + `... [${obj.length.toLocaleString()} chars total]`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLog);
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeForLog(value);
    }
    return result;
  }
  return obj;
}

// Context for the current API call (nodeId, nodeName).
// Set by calling setDebugContext() before making an API call.
interface DebugContext {
  nodeId?: string;
  nodeName?: string;
}
let currentDebugContext: DebugContext = {};

// Call this before an API function to tag the debug entry with a node.
// The context is consumed by the next debugFetch call and then cleared.
export function setDebugContext(ctx: DebugContext): void {
  currentDebugContext = ctx;
}

// Core fetch wrapper that logs every API call to the debug store.
// This replaces direct fetch() usage in all the API functions below.
async function debugFetch(
  url: string,
  init: RequestInit,
  bodyObj?: unknown
): Promise<Response> {
  const startTime = Date.now();
  const method = init.method || "GET";
  const ctx = { ...currentDebugContext };
  currentDebugContext = {}; // consume context

  let res: Response;
  let responseBody: unknown;
  let errorMessage: string | undefined;

  try {
    res = await fetch(url, init);
  } catch (networkErr) {
    // Network error (no response at all)
    const duration = Date.now() - startTime;
    errorMessage =
      networkErr instanceof Error ? networkErr.message : String(networkErr);
    addEntry({
      timestamp: Date.now(),
      endpoint: url,
      method,
      requestBody: sanitizeForLog(bodyObj),
      responseBody: null,
      statusCode: 0,
      duration,
      model: extractModelFromRequest(url, bodyObj),
      error: errorMessage,
      nodeId: ctx.nodeId,
      nodeName: ctx.nodeName,
    });
    throw networkErr;
  }

  const duration = Date.now() - startTime;

  // Clone the response so we can read the body for logging without consuming it.
  // (The caller will read from the original `res`.)
  try {
    const cloned = res.clone();
    const text = await cloned.text();
    try {
      responseBody = JSON.parse(text);
    } catch {
      // Not JSON, store as text (truncated)
      responseBody = text.length > 2000 ? text.slice(0, 2000) + "..." : text;
    }
  } catch {
    responseBody = "[could not read response]";
  }

  if (!res.ok) {
    // Extract error message from response body
    if (responseBody && typeof responseBody === "object") {
      const rb = responseBody as Record<string, unknown>;
      errorMessage = (rb.error as string) || `HTTP ${res.status}`;
    } else {
      errorMessage = `HTTP ${res.status}`;
    }
  }

  addEntry({
    timestamp: Date.now(),
    endpoint: url,
    method,
    requestBody: sanitizeForLog(bodyObj),
    responseBody: sanitizeForLog(responseBody),
    statusCode: res.status,
    duration,
    model: extractModelFromRequest(url, bodyObj),
    error: errorMessage,
    nodeId: ctx.nodeId,
    nodeName: ctx.nodeName,
  });

  return res;
}

// Helper to make an authenticated POST request with debug logging
async function apiPost(path: string, body: unknown): Promise<Response> {
  const token = getToken();
  const url = `${API_BASE}${path}`;
  return debugFetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    body
  );
}

// ============================================================
// Public API functions (all logged automatically)
// ============================================================

export async function login(username: string, password: string): Promise<boolean> {
  const res = await debugFetch(
    `${API_BASE}/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    { username, password: "***" } // sanitize password in logs
  );

  if (res.ok) {
    const data = await res.json();
    setToken(data.token);
    return true;
  }

  return false;
}

export async function checkAuth(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const res = await debugFetch(`${API_BASE}/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearToken();
    return false;
  }

  return true;
}

// Generate iPhone-style photo from text (and optionally a reference image)
export async function generatePhoto(
  text: string,
  extraInstructions?: string,
  referenceImageUrl?: string,
  format?: string,
  model?: string
): Promise<{ prompt: string; imageUrl: string }> {
  const res = await apiPost("/operations/iphone-photo", {
    text,
    extraInstructions,
    referenceImageUrl,
    format,
    model,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate photo");
  }

  return res.json();
}

// Enhance/rewrite text
export async function enhanceText(text: string, style?: string): Promise<string> {
  const res = await apiPost("/operations/enhance-text", { text, style });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to enhance text");
  }

  const data = await res.json();
  return data.result;
}

// Add text overlay to image
export async function addTextOverlay(
  imageUrl: string,
  text: string,
  style?: string
): Promise<string> {
  const res = await apiPost("/operations/text-overlay", { imageUrl, text, style });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add text overlay");
  }

  const data = await res.json();
  return data.imageUrl;
}

// Fetch and extract article text from URL
export async function fetchURL(url: string, instructions?: string): Promise<string> {
  const res = await apiPost("/operations/fetch-url", { url, instructions });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch URL");
  }

  const data = await res.json();
  return data.text;
}

// Animate image to video using Veo
export async function animateImage(
  imageUrl: string,
  prompt?: string,
  aspectRatio?: string,
  duration?: number,
  model?: string
): Promise<string> {
  const res = await apiPost("/operations/animate", {
    imageUrl,
    prompt,
    aspectRatio,
    duration,
    model,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to animate image");
  }

  const data = await res.json();
  return data.videoUrl;
}

// Transcribe audio to text
export async function transcribe(
  audioUrl?: string,
  audioBase64?: string,
  mimeType?: string,
  speakerLabels?: boolean,
  speakerIdentification?: boolean,
  speakerType?: "name" | "role",
  knownValues?: string[]
): Promise<{ transcript: string }> {
  const res = await apiPost("/operations/transcribe", {
    audioUrl,
    audioBase64,
    mimeType,
    speakerLabels,
    speakerIdentification,
    speakerType,
    knownValues,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to transcribe audio");
  }

  return res.json();
}

// Generate report from transcript
export async function generateReport(
  transcript: string,
  episodeTitle?: string
): Promise<{
  executiveSummary: string;
  sections: Array<{ title: string; content: string }>;
}> {
  const res = await apiPost("/operations/generate-report", {
    transcript,
    episodeTitle,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate report");
  }

  return res.json();
}

// Generate ad copy from report
export async function generateCopy(
  report: {
    executiveSummary: string;
    sections: Array<{ title: string; content: string }>;
  },
  platform: string,
  mode: string
): Promise<{
  fear: { headline: string; body: string; cta: string };
  greed: { headline: string; body: string; cta: string };
  curiosity: { headline: string; body: string; cta: string };
  urgency: { headline: string; body: string; cta: string };
}> {
  const res = await apiPost("/operations/generate-copy", {
    report,
    platform,
    mode,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate copy");
  }

  return res.json();
}

// Generate landing pages from report
export async function generateLandingPages(
  report: {
    executiveSummary: string;
    sections: Array<{ title: string; content: string }>;
  },
  mode: string
): Promise<{
  fear: {
    headline: string;
    subheadline: string;
    bullets: string[];
    cta: string;
    heroContent: string;
  };
  greed: {
    headline: string;
    subheadline: string;
    bullets: string[];
    cta: string;
    heroContent: string;
  };
  curiosity: {
    headline: string;
    subheadline: string;
    bullets: string[];
    cta: string;
    heroContent: string;
  };
  urgency: {
    headline: string;
    subheadline: string;
    bullets: string[];
    cta: string;
    heroContent: string;
  };
}> {
  const res = await apiPost("/operations/generate-landing-pages", {
    report,
    mode,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate landing pages");
  }

  return res.json();
}

// Fetch podcast episode info from URL
export async function fetchPodcastEpisode(
  url: string
): Promise<{ audioUrl: string; title: string }> {
  const res = await apiPost("/operations/podcast-episode", { url });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch podcast episode");
  }

  return res.json();
}

// Parse podcast RSS feed and return episodes
export async function fetchPodcastRSS(feedUrl: string): Promise<{
  feedTitle: string;
  episodes: Array<{ title: string; audioUrl: string; pubDate?: string }>;
}> {
  const res = await apiPost("/operations/podcast-rss", { feedUrl });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to parse RSS feed");
  }

  return res.json();
}

// Fetch stock info by ticker symbol
export async function fetchStockInfo(ticker: string): Promise<{
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  fundamentals: {
    marketCap?: string;
    peRatio?: number;
    dividend?: number;
    volume?: string;
  };
}> {
  const res = await apiPost("/operations/stock-info", { ticker });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch stock info");
  }

  return res.json();
}

// Generate advertorial from report (FWP pipeline)
export async function generateAdvertorial(
  report: Record<string, unknown>
): Promise<{ headline: string; content: string }> {
  const res = await apiPost("/operations/generate-advertorial", { report });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate advertorial");
  }

  return res.json();
}

// Ad copy angle structure for advertorial copy
interface AdAngle {
  primaryText: string;
  headline: string;
}

interface AdCopyResult {
  fear: AdAngle;
  greed: AdAngle;
  curiosity: AdAngle;
  urgency: AdAngle;
}

// Generate Meta ad copy from advertorial content (FWP pipeline)
export async function generateAdvertorialCopy(
  advertorialContent: string
): Promise<AdCopyResult> {
  const res = await apiPost("/operations/generate-advertorial-copy", {
    advertorialContent,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate ad copy");
  }

  return res.json();
}

// Visual concept structure for ad images
interface VisualConcept {
  concept: string;
  targetEmotion: string;
  colorScheme: string;
}

// Generate visual concepts for ad images (FWP pipeline)
export async function generateVisualConcepts(
  report: Record<string, unknown> | null,
  count: number,
  mode: string,
  advertorialContent?: string,
  customText?: string
): Promise<{ concepts: VisualConcept[] }> {
  const res = await apiPost("/operations/generate-visual-concepts", {
    report,
    count,
    mode,
    advertorialContent,
    customText,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate visual concepts");
  }

  return res.json();
}

// Summarize text
export async function summarize(
  text: string,
  maxLength?: number
): Promise<{ summary: string }> {
  const res = await apiPost("/operations/summarize", { text, maxLength });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to summarize text");
  }

  return res.json();
}

// Extract key points from text
export async function extractKeyPoints(
  text: string,
  maxPoints?: number
): Promise<{ points: string[] }> {
  const res = await apiPost("/operations/extract-key-points", {
    text,
    maxPoints,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to extract key points");
  }

  return res.json();
}

// Generate Meta ad headlines from any text
export async function generateMetaHeadlines(text: string): Promise<{
  primaryTexts: string[];
  headlines: string[];
}> {
  const res = await apiPost("/operations/generate-meta-headlines", { text });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate headlines");
  }

  return res.json();
}

// Chat with AI to build flows via natural language
export interface ChatAction {
  type: "addNode" | "connectNodes" | "loadPreset";
  nodeType?: string;
  data?: Record<string, unknown>;
  label?: string;
  sourceIndex?: number;
  targetIndex?: number;
  presetName?: string;
}

export interface ChatResponse {
  actions: ChatAction[];
  reply: string;
}

export async function chat(
  message: string,
  currentNodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
  }>,
  currentEdges: Array<{ source: string; target: string }>
): Promise<ChatResponse> {
  const res = await apiPost("/chat", { message, currentNodes, currentEdges });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to get AI response");
  }

  return res.json();
}

// Generate YouTube thumbnails with actual images from transcript/text + reference photo
export async function generateYouTubeThumbnails(
  text: string,
  referenceImageUrl?: string,
  episodeTitle?: string,
  model?: string
): Promise<{
  thumbnails: Array<{
    specific_topic: string;
    overlay_text: string;
    hook_angle: string;
    imageUrl: string;
  }>;
}> {
  const res = await apiPost("/operations/generate-youtube-thumbnails", {
    text,
    referenceImageUrl,
    episodeTitle,
    model,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate thumbnails");
  }

  return res.json();
}
