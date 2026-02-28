// API client for flow-ops backend

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

export async function login(username: string, password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

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

  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearToken();
    return false;
  }

  return true;
}

// Generate iPhone-style photo from text (and optionally a reference image)
export async function generatePhoto(text: string, extraInstructions?: string, referenceImageUrl?: string, format?: string, model?: string): Promise<{ prompt: string; imageUrl: string }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/iphone-photo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, extraInstructions, referenceImageUrl, format, model }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate photo");
  }

  return res.json();
}

// Enhance/rewrite text
export async function enhanceText(text: string, style?: string): Promise<string> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/enhance-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, style }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to enhance text");
  }

  const data = await res.json();
  return data.result;
}

// Add text overlay to image
export async function addTextOverlay(imageUrl: string, text: string, style?: string): Promise<string> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/text-overlay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageUrl, text, style }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add text overlay");
  }

  const data = await res.json();
  return data.imageUrl;
}

// Fetch and extract article text from URL
export async function fetchURL(url: string, instructions?: string): Promise<string> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/fetch-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, instructions }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch URL");
  }

  const data = await res.json();
  return data.text;
}

// Animate image to video using Veo
export async function animateImage(imageUrl: string, prompt?: string, aspectRatio?: string, duration?: number, model?: string): Promise<string> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/animate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageUrl, prompt, aspectRatio, duration, model }),
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
  speakerLabels?: boolean, // Enable speaker diarization (default: true)
  speakerIdentification?: boolean, // Enable speaker identification with real names (add-on)
  speakerType?: "name" | "role", // Type of speaker labels (default: "name")
  knownValues?: string[] // Optional list of expected speaker names/roles
): Promise<{ transcript: string }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      audioUrl,
      audioBase64,
      mimeType,
      speakerLabels,
      speakerIdentification,
      speakerType,
      knownValues,
    }),
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
): Promise<{ executiveSummary: string; sections: Array<{ title: string; content: string }> }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript, episodeTitle }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate report");
  }

  return res.json();
}

// Generate ad copy from report
export async function generateCopy(
  report: { executiveSummary: string; sections: Array<{ title: string; content: string }> },
  platform: string,
  mode: string
): Promise<{
  fear: { headline: string; body: string; cta: string };
  greed: { headline: string; body: string; cta: string };
  curiosity: { headline: string; body: string; cta: string };
  urgency: { headline: string; body: string; cta: string };
}> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-copy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ report, platform, mode }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate copy");
  }

  return res.json();
}

// Generate landing pages from report
export async function generateLandingPages(
  report: { executiveSummary: string; sections: Array<{ title: string; content: string }> },
  mode: string
): Promise<{
  fear: { headline: string; subheadline: string; bullets: string[]; cta: string; heroContent: string };
  greed: { headline: string; subheadline: string; bullets: string[]; cta: string; heroContent: string };
  curiosity: { headline: string; subheadline: string; bullets: string[]; cta: string; heroContent: string };
  urgency: { headline: string; subheadline: string; bullets: string[]; cta: string; heroContent: string };
}> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-landing-pages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ report, mode }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate landing pages");
  }

  return res.json();
}

// Fetch podcast episode info from URL
export async function fetchPodcastEpisode(url: string): Promise<{ audioUrl: string; title: string }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/podcast-episode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });

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
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/podcast-rss`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ feedUrl }),
  });

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
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/stock-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ticker }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch stock info");
  }

  return res.json();
}

// Generate advertorial from report (FWP pipeline)
export async function generateAdvertorial(report: Record<string, unknown>): Promise<{ headline: string; content: string }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-advertorial`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ report }),
  });

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
export async function generateAdvertorialCopy(advertorialContent: string): Promise<AdCopyResult> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-advertorial-copy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ advertorialContent }),
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
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-visual-concepts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ report, count, mode, advertorialContent, customText }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate visual concepts");
  }

  return res.json();
}

// Summarize text
export async function summarize(text: string, maxLength?: number): Promise<{ summary: string }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, maxLength }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to summarize text");
  }

  return res.json();
}

// Extract key points from text
export async function extractKeyPoints(text: string, maxPoints?: number): Promise<{ points: string[] }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/extract-key-points`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, maxPoints }),
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
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-meta-headlines`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate headlines");
  }

  return res.json();
}

// Generate YouTube thumbnails with actual images from transcript/text + reference photo
export async function generateYouTubeThumbnails(
  text: string,
  referenceImageUrl?: string,
  episodeTitle?: string,
  model?: string // gemini-3.1-flash (default), gemini-pro, gemini-flash
): Promise<{
  thumbnails: Array<{
    specific_topic: string;
    overlay_text: string;
    hook_angle: string;
    imageUrl: string;
  }>;
}> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/operations/generate-youtube-thumbnails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, referenceImageUrl, episodeTitle, model }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate thumbnails");
  }

  return res.json();
}