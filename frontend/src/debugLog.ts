// Debug logging system for tracking all API calls
// Stores entries in memory with an event emitter pattern for UI updates

export interface DebugEntry {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  requestBody: unknown;
  responseBody: unknown;
  statusCode: number;
  duration: number; // milliseconds
  model?: string; // which LLM model was used
  error?: string;
  nodeId?: string; // which node triggered this call
  nodeName?: string; // human-readable node name
}

// Maps endpoint paths to the default model used on the backend.
// Built from reading /src/index.ts (the Cloudflare Worker).
export const endpointModels: Record<string, string> = {
  "/api/operations/iphone-photo":
    "Gemini (prompt: gemini-3.1-pro-preview, image: varies by selection)",
  "/api/operations/text-overlay":
    "Gemini 2.5 Flash (prompt) + GPT Image 1 (image)",
  "/api/operations/animate": "Veo (varies: veo-2, veo-3.1-fast, veo-3.1)",
  "/api/operations/fetch-url": "Gemini 2.5 Flash",
  "/api/operations/enhance-text": "Gemini 2.5 Flash",
  "/api/operations/transcribe": "AssemblyAI",
  "/api/operations/generate-report": "Claude Sonnet 4 (claude-sonnet-4-20250514)",
  "/api/operations/generate-copy": "Claude Sonnet 4 (claude-sonnet-4-20250514)",
  "/api/operations/generate-landing-pages": "Claude 3 Haiku",
  "/api/operations/generate-advertorial": "Claude Sonnet 4 (claude-sonnet-4-20250514)",
  "/api/operations/generate-advertorial-copy":
    "Claude Sonnet 4 (claude-sonnet-4-20250514)",
  "/api/operations/generate-visual-concepts": "Claude 3 Haiku",
  "/api/operations/generate-meta-headlines": "Claude 3 Haiku",
  "/api/operations/generate-youtube-thumbnails":
    "Claude 3 Haiku (concepts) + Gemini (image, varies by selection)",
  "/api/operations/summarize": "Gemini 2.5 Flash",
  "/api/operations/extract-key-points": "Gemini 2.5 Flash",
  "/api/operations/podcast-episode": "None (HTML parsing)",
  "/api/operations/podcast-rss": "None (RSS parsing)",
  "/api/operations/stock-lookup": "None (mock data)",
};

// Max entries to keep in memory (circular buffer)
const MAX_ENTRIES = 100;

// Listeners that get called when the log changes
type Listener = () => void;
const listeners: Set<Listener> = new Set();

// The actual log store
let entries: DebugEntry[] = [];

// Generate a short unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Add an entry to the log
export function addEntry(entry: Omit<DebugEntry, "id">): DebugEntry {
  const full: DebugEntry = { id: generateId(), ...entry };
  entries = [full, ...entries].slice(0, MAX_ENTRIES);
  notifyListeners();
  return full;
}

// Get all entries (newest first)
export function getEntries(): DebugEntry[] {
  return entries;
}

// Clear all entries
export function clearEntries(): void {
  entries = [];
  notifyListeners();
}

// Get the entry count
export function getEntryCount(): number {
  return entries.length;
}

// Subscribe to changes. Returns an unsubscribe function.
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

// Try to extract the model name from a request body.
// Different endpoints send model info in different fields.
export function extractModelFromRequest(
  endpoint: string,
  body: unknown
): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;

  // Direct model field
  if (b.model && typeof b.model === "string") {
    return b.model;
  }

  // Fall back to the endpoint default mapping
  const path = endpoint.replace(/^https?:\/\/[^/]+/, "");
  return endpointModels[path];
}

// Custom React hook to subscribe to debug log changes.
// Returns entries and re-renders when the log changes.
// (Implemented without importing React so this file stays framework-light.
//  The component will call subscribe/getEntries itself.)
