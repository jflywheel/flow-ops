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
