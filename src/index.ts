// Worker backend for flow-ops
// Handles auth and LLM operation endpoints

interface SecretStoreSecret {
  get(): Promise<string>;
}

interface Env {
  FWP_GEMINI_API_KEY: SecretStoreSecret;
  FWP_OPENAI_API_KEY: SecretStoreSecret;
  FWP_ANTHROPIC_API_KEY: SecretStoreSecret;
  ASSEMBLYAI_API_KEY: SecretStoreSecret;
}

// Types for landing page and advertorial endpoints
interface ReportSection {
  id: string;
  title: string;
  hook: string;
  content: string;
  stockPicks?: string[];
  keyNumbers?: string[];
}

interface ReportObject {
  title: string;
  date: string;
  executiveSummary: string;
  sections: ReportSection[];
}

interface LandingPage {
  headline: string;
  bulletPoints: Array<{ title: string; description: string }>;
  closingParagraph: string;
}

interface LandingPagesResponse {
  fear: LandingPage;
  greed: LandingPage;
  curiosity: LandingPage;
  urgency: LandingPage;
}

interface AdCopy {
  primaryText: string;
  headline: string;
}

interface AdCopyResponse {
  fear: AdCopy;
  greed: AdCopy;
  curiosity: AdCopy;
  urgency: AdCopy;
}

// Simple auth token (hardcoded for dog/dog)
const VALID_TOKEN = "flow-ops-auth-token-dog";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Login endpoint - returns a token
      if (path === "/api/login" && request.method === "POST") {
        const body = await request.json() as { username?: string; password?: string };

        if (body.username === "dog" && body.password === "dog") {
          return Response.json(
            { success: true, token: VALID_TOKEN },
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return Response.json(
          { error: "Invalid credentials", code: "INVALID_CREDENTIALS" },
          { status: 401, headers: corsHeaders }
        );
      }

      // Check auth via Authorization header
      const authHeader = request.headers.get("Authorization") || "";
      const isAuthed = authHeader === `Bearer ${VALID_TOKEN}`;

      // Auth check endpoint
      if (path === "/api/me") {
        if (isAuthed) {
          return Response.json({ authenticated: true }, { headers: corsHeaders });
        }
        return Response.json(
          { error: "Not authenticated", code: "NOT_AUTHENTICATED" },
          { status: 401, headers: corsHeaders }
        );
      }

      // Protected operations require auth
      if (!isAuthed) {
        return Response.json(
          { error: "Not authenticated", code: "NOT_AUTHENTICATED" },
          { status: 401, headers: corsHeaders }
        );
      }

      // iPhone photo operation - generates actual image
      if (path === "/api/operations/iphone-photo" && request.method === "POST") {
        const body = await request.json() as { text?: string; extraInstructions?: string; referenceImageUrl?: string; format?: string; model?: string };

        if (!body.text && !body.referenceImageUrl) {
          return Response.json(
            { error: "Missing text or reference image", code: "MISSING_INPUT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiKey = await env.FWP_GEMINI_API_KEY.get();

        // If there's a reference image, first describe the person/subject in detail
        let personDescription = "";
        if (body.referenceImageUrl) {
          let imageBase64 = body.referenceImageUrl;
          let mimeType = "image/png";

          if (imageBase64.startsWith("data:")) {
            const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
            imageBase64 = imageBase64.split(",")[1];
          }

          // Use Gemini Vision to describe the person
          const visionResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
              method: "POST",
              headers: {
                "x-goog-api-key": geminiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      text: `Describe the main person in this image in precise detail for recreating them in another image. Include:
- Exact physical appearance (age, gender, ethnicity, face shape, skin tone)
- Hair (color, length, style, texture)
- Distinctive features (facial features, expressions, any unique characteristics)
- Current clothing and style

Be specific and detailed. This description will be used to generate a new image of the SAME person in a different pose or setting. Output only the description, no other text.`
                    },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: imageBase64
                      }
                    }
                  ]
                }],
              }),
            }
          );

          if (visionResponse.ok) {
            const visionData = await visionResponse.json() as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };
            personDescription = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log("Person description:", personDescription);
          }
        }

        // Step 1: Generate optimized prompt with Gemini (cheap, fast)
        const extraPart = body.extraInstructions
          ? `\n\nAdditional instructions from the user: ${body.extraInstructions}`
          : "";

        const personPart = personDescription
          ? `\n\nIMPORTANT: The image must feature this EXACT person (maintain their appearance precisely):\n${personDescription}`
          : "";

        const systemPrompt = `You are an expert at writing prompts for AI image generation.
Transform the user's text into a detailed prompt for generating a photorealistic image
that looks like it was shot on an iPhone.

The output should describe:
- Natural iPhone camera aesthetic (slight depth of field, natural lighting)
- Realistic composition as if someone casually took the photo
- Specific details that make it feel authentic and candid
- Modern iPhone quality (sharp, vibrant but natural colors)${personPart}

Keep it under 200 words. Only output the prompt itself, no explanations.${extraPart}`;

        const userText = body.text || "a casual candid photo";

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nUser's text: ${userText}` }] }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          return Response.json(
            { error: "Failed to generate prompt", code: "GEMINI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const imagePrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!imagePrompt) {
          return Response.json(
            { error: "Empty prompt generated", code: "EMPTY_PROMPT" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Step 2: Generate image with selected model
        // Map format to aspect ratio
        const aspectMap: Record<string, string> = {
          square: "1:1",
          landscape: "16:9",
          portrait: "4:5",  // For Meta feeds
          vertical: "9:16",
        };
        const aspectRatio = aspectMap[body.format || "square"] || "1:1";
        const selectedModel = body.model || "gemini-flash";

        let imageUrl = "";

        // Select Gemini model
        let geminiImageModel: string;
        if (selectedModel === "gemini-pro") {
          geminiImageModel = "gemini-3-pro-image-preview";
        } else if (selectedModel === "gemini-3.1-flash") {
          geminiImageModel = "gemini-3.1-flash-image-preview"; // Nano Banana 2 - newest model
        } else {
          geminiImageModel = "gemini-2.5-flash-image";
        }

        const imageResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiImageModel}:generateContent`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: imagePrompt }] }],
              generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                  aspectRatio: aspectRatio,
                },
              },
            }),
          }
        );

        const imageResponseText = await imageResponse.text();
        console.log("Gemini Image API response status:", imageResponse.status, "model:", geminiImageModel);

        if (!imageResponse.ok) {
          console.error("Gemini Image API error:", imageResponseText);
          return Response.json(
            { error: "Failed to generate image", code: "GEMINI_IMAGE_ERROR", details: imageResponseText },
            { status: 500, headers: corsHeaders }
          );
        }

        const imageData = JSON.parse(imageResponseText) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: { mimeType?: string; data?: string };
                inline_data?: { mime_type?: string; data?: string };
              }>;
            };
          }>;
        };

        const parts = imageData.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData || p.inline_data);
        const inlineData = (imagePart?.inlineData || imagePart?.inline_data) as { mimeType?: string; mime_type?: string; data?: string } | undefined;
        const b64 = inlineData?.data;
        const mimeType = inlineData?.mimeType || inlineData?.mime_type || "image/png";
        imageUrl = b64 ? `data:${mimeType};base64,${b64}` : "";

        if (!imageUrl) {
          return Response.json(
            { error: "No image returned", code: "NO_IMAGE" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json({
          prompt: imagePrompt,
          imageUrl: imageUrl,
        }, { headers: corsHeaders });
      }

      // Text overlay operation - adds text to an image
      if (path === "/api/operations/text-overlay" && request.method === "POST") {
        const body = await request.json() as { imageUrl?: string; text?: string; style?: string };

        if (!body.imageUrl) {
          return Response.json(
            { error: "Missing imageUrl field", code: "MISSING_IMAGE" },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!body.text) {
          return Response.json(
            { error: "Missing text field", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }

        // Use Gemini to describe how to add the text, then OpenAI to generate
        const geminiKey = await env.FWP_GEMINI_API_KEY.get();
        const openaiKey = await env.FWP_OPENAI_API_KEY.get();

        const styleInstructions = body.style || "bold white text with subtle shadow, positioned for maximum impact";

        // Step 1: Get Gemini to create a prompt for the text overlay
        const geminiPrompt = `You are an expert at writing prompts for AI image generation.

I have an existing image and I want to add text overlay to it. Create a detailed prompt that describes:
1. The original image (I'll describe it below)
2. The text "${body.text}" overlaid on it
3. The text style: ${styleInstructions}

Make the prompt describe a complete image with the text naturally integrated.
Keep it under 150 words. Only output the prompt, no explanations.

The image I'm working with appears to be a photorealistic photo. Add the text "${body.text}" to it.`;

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          return Response.json(
            { error: "Failed to generate prompt", code: "GEMINI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const overlayPrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Step 2: Use OpenAI to edit the image with the text
        // We'll use the edit endpoint with the original image
        let imageBase64 = body.imageUrl;
        if (imageBase64.startsWith("data:")) {
          imageBase64 = imageBase64.split(",")[1];
        }

        // Use gpt-image-1 to generate a new image with the text overlay concept
        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: `${overlayPrompt}. The text "${body.text}" must be clearly visible and legible in the image.`,
            n: 1,
            size: "1024x1024",
            quality: "medium",
          }),
        });

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error("OpenAI API error:", errorText);
          return Response.json(
            { error: "Failed to generate image with text", code: "OPENAI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const imageData = await imageResponse.json() as {
          data?: Array<{ url?: string; b64_json?: string }>;
        };

        const b64 = imageData.data?.[0]?.b64_json;
        const resultUrl = b64 ? `data:image/png;base64,${b64}` : "";

        if (!resultUrl) {
          return Response.json(
            { error: "No image returned", code: "NO_IMAGE" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json({ imageUrl: resultUrl }, { headers: corsHeaders });
      }

      // Animate operation - generates video from image using Veo
      if (path === "/api/operations/animate" && request.method === "POST") {
        const body = await request.json() as { imageUrl?: string; prompt?: string; aspectRatio?: string; duration?: number; model?: string };

        if (!body.imageUrl) {
          return Response.json(
            { error: "Missing imageUrl field", code: "MISSING_IMAGE" },
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiKey = await env.FWP_GEMINI_API_KEY.get();

        // Convert base64 data URL to raw base64 and extract mime type
        let imageBase64 = body.imageUrl;
        let mimeType = "image/png";

        if (imageBase64.startsWith("data:")) {
          // Extract mime type from data URL (e.g., "data:image/png;base64,...")
          const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
          imageBase64 = imageBase64.split(",")[1];
        }

        // Log image info for debugging
        console.log("Animate request - mimeType:", mimeType, "base64 length:", imageBase64.length);

        // Step 1: Start video generation with selected Veo model
        const aspectRatio = body.aspectRatio || "16:9";
        const duration = body.duration || 8; // Default to 8 seconds
        const selectedModel = body.model || "veo-2";

        // Map model selection to API model name
        const veoModelMap: Record<string, string> = {
          "veo-2": "veo-2.0-generate-001",
          "veo-3.1-fast": "veo-3.1-fast-generate-preview",
          "veo-3.1": "veo-3.1-generate-preview",
        };
        const veoModel = veoModelMap[selectedModel] || "veo-2.0-generate-001";

        const requestBody = {
          instances: [{
            image: {
              bytesBase64Encoded: imageBase64,
              mimeType: mimeType,
            },
            prompt: body.prompt || "Animate this image with subtle, natural motion",
          }],
          parameters: {
            aspectRatio: aspectRatio,
            durationSeconds: duration,
          },
        };

        console.log("Veo request - model:", veoModel, "prompt:", requestBody.instances[0].prompt);

        const startResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        const responseText = await startResponse.text();
        console.log("Veo start response status:", startResponse.status, "body:", responseText);

        if (!startResponse.ok) {
          console.error("Veo API start error:", responseText);
          return Response.json(
            { error: "Failed to start video generation", code: "VEO_START_ERROR", details: responseText },
            { status: 500, headers: corsHeaders }
          );
        }

        let startData: { name?: string };
        try {
          startData = JSON.parse(responseText);
        } catch {
          return Response.json(
            { error: "Invalid response from Veo", code: "VEO_PARSE_ERROR", details: responseText },
            { status: 500, headers: corsHeaders }
          );
        }

        const operationName = startData.name;
        console.log("Veo operation started:", operationName);

        if (!operationName) {
          return Response.json(
            { error: "No operation name returned", code: "NO_OPERATION", details: responseText },
            { status: 500, headers: corsHeaders }
          );
        }

        // Step 2: Poll for completion (max 6 minutes, poll every 10 seconds)
        let videoUrl = "";
        const maxAttempts = 36; // 6 minutes / 10 seconds

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

          const pollResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
            {
              headers: {
                "x-goog-api-key": geminiKey,
              },
            }
          );

          if (!pollResponse.ok) {
            console.error("Veo poll error:", await pollResponse.text());
            continue;
          }

          const pollData = await pollResponse.json() as {
            done?: boolean;
            response?: {
              generateVideoResponse?: {
                generatedSamples?: Array<{
                  video?: { uri?: string };
                }>;
              };
            };
            error?: { message?: string };
          };

          console.log("Poll response:", JSON.stringify(pollData, null, 2));

          if (pollData.error) {
            console.error("Veo error:", pollData.error);
            return Response.json(
              { error: pollData.error.message || "Video generation failed", code: "VEO_ERROR" },
              { status: 500, headers: corsHeaders }
            );
          }

          if (pollData.done) {
            console.log("Video done! Full response:", JSON.stringify(pollData.response, null, 2));
            videoUrl = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || "";
            console.log("Extracted video URL:", videoUrl);
            break;
          }
        }

        if (!videoUrl) {
          return Response.json(
            { error: "Video generation timed out or failed", code: "VEO_TIMEOUT" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Download the video using the API key (required for auth)
        console.log("Downloading video from:", videoUrl);
        const videoResponse = await fetch(videoUrl, {
          headers: {
            "x-goog-api-key": geminiKey,
          },
        });

        if (!videoResponse.ok) {
          const errorText = await videoResponse.text();
          console.error("Video download failed:", errorText);
          return Response.json(
            { error: "Failed to download video", code: "VIDEO_DOWNLOAD_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Convert to base64 data URL
        const videoBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = btoa(
          new Uint8Array(videoBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        const videoDataUrl = `data:video/mp4;base64,${videoBase64}`;

        console.log("Video converted, size:", videoBuffer.byteLength, "bytes");

        return Response.json({
          videoUrl: videoDataUrl,
        }, { headers: corsHeaders });
      }

      // URL fetch operation - extracts article text from a webpage
      if (path === "/api/operations/fetch-url" && request.method === "POST") {
        const body = await request.json() as { url?: string; instructions?: string };

        if (!body.url) {
          return Response.json(
            { error: "Missing url field", code: "MISSING_URL" },
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiKey = await env.FWP_GEMINI_API_KEY.get();

        // Step 1: Fetch the webpage with browser-like headers
        let pageHtml = "";
        let fetchError = "";

        try {
          const pageResponse = await fetch(body.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              "Accept-Encoding": "gzip, deflate, br",
              "Connection": "keep-alive",
              "Upgrade-Insecure-Requests": "1",
            },
          });

          if (!pageResponse.ok) {
            fetchError = `HTTP ${pageResponse.status}: ${pageResponse.statusText}`;
          } else {
            pageHtml = await pageResponse.text();
          }
        } catch (err) {
          fetchError = err instanceof Error ? err.message : "Fetch failed";
        }

        if (fetchError || !pageHtml) {
          console.error("Failed to fetch URL:", fetchError);
          return Response.json(
            { error: `Failed to fetch page: ${fetchError}`, code: "FETCH_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Step 2: Strip HTML tags and clean up text
        // Remove script, style, nav, header, footer tags and their content
        let cleanHtml = pageHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
          .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ");

        // Remove all remaining HTML tags
        const rawText = cleanHtml
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim();

        // Limit to ~50k chars to avoid hitting token limits
        const truncatedText = rawText.slice(0, 50000);

        // Step 3: Use Gemini to extract the main article content
        const extraInstructions = body.instructions
          ? `\n\nAdditional instructions from the user: ${body.instructions}`
          : "";

        const extractPrompt = `You are an expert at extracting article content from web pages.

Given the following raw text extracted from a webpage, identify and return ONLY the main article content. Remove:
- Navigation text
- Ads and promotional content
- Related article links
- Comments
- Author bios (unless relevant)
- Social sharing text
- Cookie notices and legal disclaimers

Return the clean article text, preserving important formatting like paragraphs and headings. If there's no clear article (e.g., it's a homepage or product page), extract the most relevant content.${extraInstructions}

Raw webpage text:
${truncatedText}`;

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: extractPrompt }] }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          return Response.json(
            { error: "Failed to extract article", code: "GEMINI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const articleText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!articleText) {
          return Response.json(
            { error: "Could not extract article content", code: "NO_CONTENT" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json({ text: articleText }, { headers: corsHeaders });
      }

      // Transcribe operation - transcribes audio using AssemblyAI
      if (path === "/api/operations/transcribe" && request.method === "POST") {
        const body = await request.json() as {
          audioUrl?: string;
          speakerLabels?: boolean;
          speakerIdentification?: boolean;
          speakerType?: "name" | "role";
          knownValues?: string[];
        };

        if (!body.audioUrl) {
          return Response.json(
            { error: "Missing audioUrl field", code: "MISSING_AUDIO" },
            { status: 400, headers: corsHeaders }
          );
        }

        const assemblyKey = await env.ASSEMBLYAI_API_KEY.get();
        const useSpeakerLabels = body.speakerLabels !== false; // Default to true
        const useSpeakerIdentification = body.speakerIdentification === true; // Default to false (add-on cost)
        const speakerType = body.speakerType || "name";
        const knownValues = body.knownValues || [];

        // Build request body for AssemblyAI
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transcriptRequest: Record<string, any> = {
          audio_url: body.audioUrl,
          speech_model: "best",
          speaker_labels: useSpeakerLabels,
        };

        // Add speaker identification via Speech Understanding API if enabled
        if (useSpeakerIdentification && useSpeakerLabels) {
          transcriptRequest.speech_understanding = {
            request: {
              speaker_identification: {
                speaker_type: speakerType,
                ...(knownValues.length > 0 && { known_values: knownValues }),
              },
            },
          };
        }

        // Step 1: Submit transcription request to AssemblyAI
        console.log("Submitting to AssemblyAI:", body.audioUrl, "speaker_labels:", useSpeakerLabels, "speaker_identification:", useSpeakerIdentification);
        const submitResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
          method: "POST",
          headers: {
            "Authorization": assemblyKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transcriptRequest),
        });

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          console.error("AssemblyAI submit error:", errorText);
          return Response.json(
            { error: "Failed to submit transcription", code: "ASSEMBLYAI_SUBMIT_ERROR", details: errorText },
            { status: 500, headers: corsHeaders }
          );
        }

        const submitData = await submitResponse.json() as { id: string; status: string };
        const transcriptId = submitData.id;
        console.log("AssemblyAI transcript ID:", transcriptId);

        // Step 2: Poll for completion (max 10 minutes for long podcasts)
        const maxAttempts = 120; // 120 * 5s = 10 minutes
        let attempts = 0;

        // Types for AssemblyAI response with speaker diarization/identification
        interface Utterance {
          speaker: string;
          text: string;
          start: number;
          end: number;
        }
        interface SpeechUnderstandingResponse {
          utterances?: Utterance[];
        }
        interface PollData {
          status: string;
          text?: string;
          utterances?: Utterance[];
          error?: string;
          speech_understanding?: {
            status?: string;
            response?: SpeechUnderstandingResponse;
          };
        }

        let pollData: PollData | null = null;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls

          const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { "Authorization": assemblyKey },
          });

          if (!pollResponse.ok) {
            const errorText = await pollResponse.text();
            console.error("AssemblyAI poll error:", errorText);
            return Response.json(
              { error: "Failed to check transcription status", code: "ASSEMBLYAI_POLL_ERROR", details: errorText },
              { status: 500, headers: corsHeaders }
            );
          }

          pollData = await pollResponse.json() as PollData;
          console.log("AssemblyAI status:", pollData.status, "attempt:", attempts + 1);

          if (pollData.status === "completed") {
            break;
          } else if (pollData.status === "error") {
            return Response.json(
              { error: `Transcription failed: ${pollData.error}`, code: "ASSEMBLYAI_ERROR" },
              { status: 500, headers: corsHeaders }
            );
          }

          attempts++;
        }

        if (!pollData || pollData.status !== "completed") {
          return Response.json(
            { error: "Transcription timed out", code: "TIMEOUT" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Use speaker identification results if available, otherwise fall back to diarization
        const utterances = pollData.speech_understanding?.response?.utterances || pollData.utterances;

        // Format transcript with speaker labels if available
        let transcript = "";
        if (utterances && utterances.length > 0) {
          // Check if we have real names (from speaker identification) or generic labels (A, B, C)
          const hasRealNames = utterances.some((u: Utterance) => u.speaker && u.speaker.length > 1);

          // Format with speaker labels and timestamps
          transcript = utterances.map((u: Utterance) => {
            const minutes = Math.floor(u.start / 60000);
            const seconds = Math.floor((u.start % 60000) / 1000);
            const timestamp = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
            // Use "Speaker A" format only for generic single-letter labels
            const speakerLabel = hasRealNames ? u.speaker : `Speaker ${u.speaker}`;
            return `${timestamp} ${speakerLabel}:\n${u.text}`;
          }).join("\n\n");
        } else {
          // Fallback to plain text
          transcript = pollData.text || "";
        }

        return Response.json({ transcript }, { headers: corsHeaders });
      }

      // Generate report operation - creates investment report from transcript using Claude
      if (path === "/api/operations/generate-report" && request.method === "POST") {
        const body = await request.json() as { transcript?: string; episodeTitle?: string };

        if (!body.transcript) {
          return Response.json(
            { error: "Missing transcript field", code: "MISSING_TRANSCRIPT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const episodeTitle = body.episodeTitle || "Investment Report";
        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();

        // Get today's date for the prompt
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });

        // Build the prompt from FWP-PROMPT-REFERENCE.md section 1
        const prompt = `You are a senior financial analyst creating a premium investment research report for 247 Wall St. This report will be offered as a free lead magnet, so it must feel valuable enough that someone would give their email address to receive it.

Today's date: ${today}
Episode: "${episodeTitle}"

TRANSCRIPT:
${body.transcript.slice(0, 50000)}

YOUR MISSION:
Transform this podcast transcript into a high-value research report that feels like premium financial analysis. Think of reports from top-tier investment research firms: structured, authoritative, data-driven, and immediately actionable.

EXECUTIVE SUMMARY GUIDELINES:
Write a compelling 3-4 sentence executive summary that:
- Positions the report as timely and essential for investors right now
- Highlights the most important findings or opportunities discussed
- Creates urgency without being hypey (focus on market conditions, timing, opportunities)
- Sounds professional and authoritative

SECTION STRUCTURE GUIDELINES:
Create 6-12 sections depending on the content. Each section should be a complete, standalone mini-report that delivers real value.

For each section:

1. **Title**: Professional and descriptive. Not clickbait. Examples:
   - "The 7 Technology Stocks Positioned for AI Dominance"
   - "Three Undervalued Dividend Plays in Healthcare"
   - "Why the Federal Reserve's Next Move Matters for Your Portfolio"

2. **Hook**: The attention-grabbing angle for ads/marketing. This is your most compelling, curiosity-driven version:
   - "The 7 tech stocks Wall Street insiders are quietly accumulating"
   - "3 dividend stocks yielding 5%+ that most investors don't know about"
   - "What the Fed's next decision means for your retirement savings"

3. **Content**: Write 300-500 words of substantive analysis that delivers on the promise. Structure it like this:
   - Opening: Why this matters now (market context, timing, relevance)
   - Core analysis: The specific stocks, strategies, or insights promised
   - Details: For each stock/idea mentioned, provide:
     * Ticker symbol and company name
     * Key fundamentals (P/E, yield, growth rate, market cap, etc.)
     * The investment thesis (why it's attractive)
     * Specific catalysts or risks
   - Closing: Actionable takeaway (what investors should consider doing)

   Make the content feel cohesive and uniquely valuable. Don't just transcribe what was said - synthesize it into professional research analysis. Use specific numbers, percentages, dollar amounts, and dates.

4. **Stock Picks**: Include ALL tickers mentioned in that section

5. **Key Numbers**: Extract compelling data points like:
   - "$2.3 trillion market opportunity"
   - "Trading at 12x earnings (30% below sector average)"
   - "Dividend yield of 5.2%"
   - "Projected 25% revenue growth in 2026"

STYLE GUIDELINES:
- Professional, authoritative tone (like you're a veteran Wall Street analyst)
- Data-driven and specific (use numbers, percentages, dates)
- Balanced perspective (acknowledge both opportunities AND risks where relevant)
- Use plain ASCII only (no em-dashes, curly quotes, special characters)
- Write in paragraphs (break dense content into digestible chunks)
- Avoid hype words like "revolutionary" or "game-changing"
- Instead use specific, factual language: "positioned for 25% growth" or "trading at significant discount to peers"

ACCURACY REQUIREMENT:
Only include information actually discussed in the transcript. Do not invent stock picks, numbers, or analysis. If the podcast is vague about details, acknowledge that in the content (e.g., "While specific valuation targets weren't provided, the key drivers include...")

Respond in this exact JSON format:
{
  "executiveSummary": "A compelling 3-4 sentence executive summary...",
  "sections": [
    {
      "id": "section-1",
      "title": "Professional descriptive title (not clickbait)",
      "hook": "The attention-grabbing marketing angle",
      "content": "300-500 words of substantive investment analysis...",
      "stockPicks": ["AAPL", "MSFT", "GOOGL"],
      "keyNumbers": ["$2.3 trillion market", "12x P/E ratio", "5.2% dividend yield"]
    }
  ]
}`;

        // Call Anthropic API
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate report", code: "ANTHROPIC_ERROR", details: errorText },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.find(c => c.type === "text")?.text || "";

        if (!responseText) {
          return Response.json(
            { error: "No response from Claude", code: "NO_RESPONSE" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Parse the JSON response from Claude
        let reportData: { executiveSummary: string; sections: Array<ReportSection> };
        try {
          // Claude might wrap the JSON in markdown code blocks, so strip those
          let jsonText = responseText;
          if (jsonText.includes("```json")) {
            jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          } else if (jsonText.includes("```")) {
            jsonText = jsonText.replace(/```\n?/g, "");
          }
          reportData = JSON.parse(jsonText.trim());
        } catch (err) {
          console.error("Failed to parse Claude response as JSON:", err);
          return Response.json(
            { error: "Failed to parse report response", code: "PARSE_ERROR", rawResponse: responseText },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json({
          executiveSummary: reportData.executiveSummary,
          sections: reportData.sections
        }, { headers: corsHeaders });
      }

      // Generate copy operation - creates ad headlines and descriptions using Claude
      if (path === "/api/operations/generate-copy" && request.method === "POST") {
        // Input type for this endpoint (report structure from generate-report)
        interface CopyGenerateReport {
          executiveSummary: string;
          sections: ReportSection[];
        }

        interface CopyGenerateRequest {
          report?: CopyGenerateReport;
          platform?: "google" | "meta";
          mode?: "report" | "newsletter";
        }

        const body = await request.json() as CopyGenerateRequest;

        if (!body.report) {
          return Response.json(
            { error: "Missing report field", code: "MISSING_REPORT" },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!body.platform || !["google", "meta"].includes(body.platform)) {
          return Response.json(
            { error: "Invalid platform. Must be 'google' or 'meta'", code: "INVALID_PLATFORM" },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!body.mode || !["report", "newsletter"].includes(body.mode)) {
          return Response.json(
            { error: "Invalid mode. Must be 'report' or 'newsletter'", code: "INVALID_MODE" },
            { status: 400, headers: corsHeaders }
          );
        }

        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const report = body.report;
        const platform = body.platform;
        const mode = body.mode;

        // Build context from report sections
        const allStocks = report.sections.flatMap(s => s.stockPicks || []);
        const allNumbers = report.sections.flatMap(s => s.keyNumbers || []);
        const sectionsContext = report.sections
          .map(s => `SECTION: ${s.title}\nHOOK: ${s.hook}\nKEY NUMBERS: ${(s.keyNumbers || []).join(", ")}\nSTOCKS: ${(s.stockPicks || []).join(", ")}`)
          .join("\n\n");

        // Get today's date
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Build the appropriate prompt based on mode and platform
        let prompt = "";

        if (mode === "report" && platform === "google") {
          // 2a: Report Mode + Google Platform
          prompt = `You are a direct response copywriter creating Google Demand Gen ad copy for 24/7 Wall St, a financial news and investing site. Your goal is to drive clicks to a free investment report.

TODAY'S DATE: ${today}

REPORT TITLE: "Investment Report"
EXECUTIVE SUMMARY: ${report.executiveSummary}

ALL STOCKS MENTIONED: ${allStocks.join(", ") || "Various stocks"}
KEY NUMBERS: ${allNumbers.join(", ") || "Multiple data points"}

REPORT SECTIONS:
${sectionsContext}

===== GOOGLE ADS COMPLIANCE - CRITICAL =====
Google REJECTS ads with "Unreliable claims" in financial services. You MUST avoid:

BANNED WORDS/PHRASES (will get rejected):
- "profit", "profits", "profiting"
- "gains", "returns", "make money"
- "price targets", "target price"
- "missed gains", "missing out on money"
- "guaranteed", "proven"
- Any promise of financial outcomes

SAFE ALTERNATIVES TO USE:
- Instead of "profit": use "informed", "ahead", "prepared"
- Instead of "gains": use "opportunities", "moves", "trends"
- Instead of "price targets": use "analysis", "research", "recommendations"
- Instead of "make money": use "make decisions", "take action"
- Focus on INFORMATION received, not MONEY made
============================================

YOUR TASK:
Generate Google Demand Gen ad copy grouped by 4 ANGLES. Each angle targets a different psychological trigger.

ANGLES (reframed for Google compliance):
1. FEAR - Missing information, being uninformed, market risks ("Oracle down 53%", "Market warning signs")
2. GREED - Getting valuable research for free, expert analysis ("Free expert analysis", "$4T market opportunity")
3. CURIOSITY - Hidden info, secrets, what others don't know ("Hidden opportunity", "What Wall St isn't saying")
4. URGENCY - Time pressure, timely analysis ("Before market opens", "Q4 window closing")

STRICT CHARACTER LIMITS (Google will reject ads that exceed these):
- Headlines: EXACTLY 30 characters or less
- Descriptions: EXACTLY 90 characters or less

GENERATE FOR EACH ANGLE:
- 5 headlines (30 chars max each)
- 5 descriptions (90 chars max each)
Total: 20 headlines, 20 descriptions across 4 angles

WRITING STYLE:
- Use sentence case (first letter capitalized, rest lowercase)
- NOT Title Case Like This
- No em-dashes, use commas or periods
- No "not X, but Y" phrasing
- ASCII characters only
- Professional financial tone
- Focus on INFORMATION, never on profits/gains

Respond in JSON format with fear, greed, curiosity, urgency objects containing headlines and descriptions arrays.`;
        } else if (mode === "report" && platform === "meta") {
          // 2b: Report Mode + Meta Platform
          prompt = `You are a direct response copywriter creating Meta/Facebook ad copy for 24/7 Wall St, a financial news and investing site. Your goal is to drive clicks to a free investment report.

TODAY'S DATE: ${today}

REPORT TITLE: "Investment Report"
EXECUTIVE SUMMARY: ${report.executiveSummary}

ALL STOCKS MENTIONED: ${allStocks.join(", ") || "Various stocks"}
KEY NUMBERS: ${allNumbers.join(", ") || "Multiple data points"}

REPORT SECTIONS:
${sectionsContext}

YOUR TASK:
Generate Meta/Facebook ad copy grouped by 4 ANGLES. Each angle targets a different psychological trigger.

ANGLES (be aggressive - Meta allows profit/gains language):
1. FEAR - Loss aversion, crashes, what they're missing, risks ("Oracle Down 53%", "Wall St Panic", "Missed gains")
2. GREED - Gains, profits, upside potential ("495% gains", "$4T opportunity", "10X returns possible")
3. CURIOSITY - Hidden info, secrets, what others don't know ("Hidden Tech Rockets", "What Wall St Won't Tell You")
4. URGENCY - Time pressure, act now, limited window ("Before Market Opens", "Q4 Window Closing")

STRICT CHARACTER LIMITS:
- Headlines: EXACTLY 40 characters or less
- Primary text (descriptions): EXACTLY 125 characters or less

GENERATE FOR EACH ANGLE:
- 5 headlines (40 chars max each)
- 5 descriptions (125 chars max each)
Total: 20 headlines, 20 descriptions across 4 angles

WRITING STYLE:
- Use sentence case
- No em-dashes, use commas or periods
- ASCII characters only
- Aggressive, emotional direct response tone
- Focus on PROFITS and GAINS - be bold

Respond in JSON format.`;
        } else if (mode === "newsletter" && platform === "google") {
          // 2c: Newsletter Mode + Google Platform
          prompt = `You are a direct response copywriter creating Google Demand Gen ad copy for 24/7 Wall St's free newsletter "The Daily Profit". Your goal is to drive newsletter signups.

TODAY'S DATE: ${today}

NEWSLETTER: "The Daily Profit" - Free daily investment newsletter from 24/7 Wall St

BONUS REPORT CONTEXT (mention briefly if relevant):
EXECUTIVE SUMMARY: ${report.executiveSummary}

STOCKS MENTIONED: ${allStocks.join(", ") || "Various stocks"}
KEY NUMBERS: ${allNumbers.join(", ") || "Multiple data points"}

REPORT SECTIONS:
${sectionsContext}

===== GOOGLE ADS COMPLIANCE - CRITICAL =====
Google REJECTS ads with "Unreliable claims" in financial services. You MUST avoid:

BANNED WORDS/PHRASES (will get rejected):
- "profit", "profits", "profiting" (newsletter name "Daily Profit" is OK, but don't use the word elsewhere)
- "gains", "returns", "make money"
- "price targets", "target price"
- "missed gains", "missing out on money"
- "guaranteed", "proven"
- Any promise of financial outcomes

SAFE ALTERNATIVES TO USE:
- Instead of "profit": use "informed", "ahead", "prepared"
- Instead of "gains": use "opportunities", "moves", "trends"
- Instead of "price targets": use "analysis", "research", "recommendations"
- Instead of "make money": use "make decisions", "take action"
- Focus on INFORMATION received, not MONEY made
============================================

YOUR TASK:
Generate Google Demand Gen ad copy grouped by 4 ANGLES. Each angle targets a different psychological trigger.

ANGLES (reframed for Google compliance):
1. FEAR - Missing information, being uninformed, market risks
2. GREED - Getting valuable research for free, expert analysis
3. CURIOSITY - Hidden info, secrets, what others don't know
4. URGENCY - Time pressure, timely analysis

STRICT CHARACTER LIMITS (Google will reject ads that exceed these):
- Headlines: EXACTLY 30 characters or less
- Descriptions: EXACTLY 90 characters or less

GENERATE FOR EACH ANGLE:
- 5 headlines (30 chars max each)
- 5 descriptions (90 chars max each)
Total: 20 headlines, 20 descriptions across 4 angles

WRITING STYLE:
- Use sentence case (first letter capitalized, rest lowercase)
- NOT Title Case Like This
- No em-dashes, use commas or periods
- No "not X, but Y" phrasing
- ASCII characters only
- Professional financial tone
- Focus on INFORMATION, never on profits/gains

Respond in JSON format with fear, greed, curiosity, urgency objects containing headlines and descriptions arrays.`;
        } else {
          // 2d: Newsletter Mode + Meta Platform
          prompt = `You are a direct response copywriter creating Meta/Facebook ad copy for 24/7 Wall St's free newsletter "The Daily Profit". Your goal is to drive newsletter signups.

TODAY'S DATE: ${today}

NEWSLETTER: "The Daily Profit" - Free daily investment newsletter from 24/7 Wall St

BONUS REPORT CONTEXT (mention briefly if relevant):
EXECUTIVE SUMMARY: ${report.executiveSummary}

STOCKS MENTIONED: ${allStocks.join(", ") || "Various stocks"}
KEY NUMBERS: ${allNumbers.join(", ") || "Multiple data points"}

REPORT SECTIONS:
${sectionsContext}

YOUR TASK:
Generate Meta/Facebook ad copy grouped by 4 ANGLES. Each angle targets a different psychological trigger.

ANGLES (be aggressive - Meta allows profit/gains language):
1. FEAR - Loss aversion, crashes, what they're missing, risks
2. GREED - Gains, profits, upside potential
3. CURIOSITY - Hidden info, secrets, what others don't know
4. URGENCY - Time pressure, act now, limited window

STRICT CHARACTER LIMITS:
- Headlines: EXACTLY 40 characters or less
- Primary text (descriptions): EXACTLY 125 characters or less

GENERATE FOR EACH ANGLE:
- 5 headlines (40 chars max each)
- 5 descriptions (125 chars max each)
Total: 20 headlines, 20 descriptions across 4 angles

WRITING STYLE:
- Use sentence case
- No em-dashes, use commas or periods
- ASCII characters only
- Aggressive, emotional direct response tone
- Focus on PROFITS and GAINS - be bold

Respond in JSON format with fear, greed, curiosity, urgency objects containing headlines and descriptions arrays.`;
        }

        // Call Claude API
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Claude API error:", errorText);
          return Response.json(
            { error: "Failed to generate copy", code: "CLAUDE_ERROR", details: errorText },
            { status: 500, headers: corsHeaders }
          );
        }

        const claudeData = await response.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const textContent = claudeData.content?.find(c => c.type === "text");
        const rawText = textContent?.text || "";

        if (!rawText) {
          return Response.json(
            { error: "Empty response from Claude", code: "EMPTY_RESPONSE" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Parse JSON from Claude's response (handle markdown code blocks and extra text)
        let jsonText = rawText;

        // Remove ```json ... ``` or ``` ... ``` blocks
        const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1].trim();
        }

        // Try to find JSON object if there's extra text
        const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonText = jsonObjMatch[0];
        }

        try {
          const copyResult = JSON.parse(jsonText) as {
            fear: { headlines: string[]; descriptions: string[] };
            greed: { headlines: string[]; descriptions: string[] };
            curiosity: { headlines: string[]; descriptions: string[] };
            urgency: { headlines: string[]; descriptions: string[] };
          };

          return Response.json(copyResult, { headers: corsHeaders });
        } catch (parseError) {
          console.error("Failed to parse Claude response as JSON:", rawText);
          return Response.json(
            { error: "Failed to parse copy response", code: "PARSE_ERROR", raw: rawText },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // Generate landing pages operation - creates 4 landing pages for different psychological angles
      if (path === "/api/operations/generate-landing-pages" && request.method === "POST") {
        const body = await request.json() as { report?: ReportObject; mode?: "report" | "newsletter" };

        if (!body.report) {
          return Response.json(
            { error: "Missing report field", code: "MISSING_REPORT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const report = body.report;
        const mode = body.mode || "report";
        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const today = new Date().toISOString().split("T")[0];

        // Build sections context from report
        const sectionsContext = report.sections.map((s, i) =>
          `Section ${i + 1}: "${s.title}"\nHook: ${s.hook}\nStocks: ${s.stockPicks?.join(", ") || "None"}\nKey Numbers: ${s.keyNumbers?.join(", ") || "None"}`
        ).join("\n\n");

        // Collect all key numbers from sections
        const allKeyNumbers = report.sections.flatMap(s => s.keyNumbers || []);

        let systemPrompt: string;

        if (mode === "newsletter") {
          // 3b: Newsletter Mode Landing Pages (Google Compliant)
          systemPrompt = `You are creating 4 direct response landing pages for 24/7 Wall St's free newsletter "The Daily Profit", each targeting a different psychological angle.

TODAY'S DATE: ${today}

===== GOOGLE ADS COMPLIANCE - CRITICAL =====
These landing pages are used with Google Ads. Google REJECTS pages with "Unreliable claims."

BANNED WORDS/PHRASES (will get rejected):
- "profit", "profits", "profiting" (even though newsletter is called "Daily Profit", avoid using the word elsewhere)
- "gains", "returns", "make money"
- "price targets", "target price"
- Any promise of financial outcomes or guaranteed results

SAFE ALTERNATIVES:
- Instead of "profit from news": "act on news", "understand what matters"
- Instead of "price targets": "analysis", "research", "recommendations"
- Instead of "make money": "make informed decisions", "stay ahead"
- Focus on INFORMATION and ANALYSIS, not financial outcomes
============================================

WHAT THE DAILY PROFIT OFFERS:
- Free daily email from 24/7 Wall St
- Daily stock analysis and actionable research
- Covers stocks, ETFs, and crypto with specific recommendations
- Expert analysis from a team with 15+ years experience
- Goes beyond headlines to explain what matters for investors

BONUS REPORT TITLE (mention briefly at end): "${report.title}"

Create 4 landing pages. Focus on the VALUE of expert analysis and research. The report is a signup bonus, mentioned only briefly in closing.

ANGLES (reframed for compliance):
1. FEAR - Missing important market analysis, being uninformed while others act on research
2. GREED - Getting valuable expert research for free, daily analysis others pay for
3. CURIOSITY - What expert analysts see that headlines miss, the research behind the news
4. URGENCY - Markets move daily, get timely analysis before the market opens

BULLET POINT REQUIREMENTS (critical):
- ALL 3 bullets must be about the NEWSLETTER's ongoing value
- Focus on: daily analysis, expert research, actionable recommendations, going beyond headlines
- Do NOT mention the bonus report in bullets
- NEVER use banned words (profit, gains, price targets, etc.)`;
        } else {
          // 3a: Report Mode Landing Pages
          systemPrompt = `You are creating 4 direct response landing pages for 24/7 Wall St, each targeting a different psychological angle.

TODAY'S DATE: ${today}

REPORT TITLE: "${report.title}"
EXECUTIVE SUMMARY: ${report.executiveSummary}

REPORT SECTIONS:
${sectionsContext}

KEY NUMBERS FROM REPORT: ${allKeyNumbers.join(", ") || "Various data points"}

Create 4 landing pages, one for each ANGLE:
1. FEAR - Loss aversion, crashes, risks, what they're missing
2. GREED - Gains, profits, upside potential, wealth building
3. CURIOSITY - Hidden info, secrets, what others don't know
4. URGENCY - Time pressure, act now, limited window

Each page needs: headline, 3 bulletPoints, closingParagraph.
The MAIN OFFER is this specific report.

Respond in this exact JSON format:
{
  "fear": {
    "headline": "Fear-focused headline emphasizing risks or losses",
    "bulletPoints": [
      {"title": "Short title", "description": "Fear-focused description"},
      {"title": "Short title", "description": "Fear-focused description"},
      {"title": "Short title", "description": "Fear-focused description"}
    ],
    "closingParagraph": "Fear-focused urgency paragraph"
  },
  "greed": { ... },
  "curiosity": { ... },
  "urgency": { ... }
}

CRITICAL JSON RULES:
- Output ONLY valid JSON, no markdown, no explanation
- Do NOT use quotes inside string values
- No emdashes, use commas or periods instead
- ASCII characters only

WRITING RULES:
- Be specific with numbers when available
- Professional financial services tone
- Each angle should feel distinctly different`;
        }

        // Call Anthropic API with Claude Haiku (cheaper for this task)
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 4000,
            messages: [
              {
                role: "user",
                content: systemPrompt,
              },
            ],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate landing pages", code: "ANTHROPIC_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.[0]?.text || "";

        if (!responseText) {
          return Response.json(
            { error: "Empty response from AI", code: "EMPTY_RESPONSE" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Parse the JSON response - handle markdown code blocks
        let landingPages: LandingPagesResponse;
        try {
          let jsonText = responseText;

          // Remove ```json ... ``` or ``` ... ``` blocks
          const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim();
          }

          // Try to find JSON object if there's extra text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          landingPages = JSON.parse(jsonText);
        } catch {
          console.error("Failed to parse landing pages JSON:", responseText.slice(0, 500));
          return Response.json(
            { error: "Invalid JSON response from AI", code: "PARSE_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json(landingPages, { headers: corsHeaders });
      }

      // Generate advertorial operation - creates long-form advertorial article
      if (path === "/api/operations/generate-advertorial" && request.method === "POST") {
        const body = await request.json() as { report?: ReportObject };

        if (!body.report) {
          return Response.json(
            { error: "Missing report field", code: "MISSING_REPORT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const report = body.report;
        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const today = new Date().toISOString().split("T")[0];

        // Build section summaries for the prompt
        const sectionSummaries = report.sections.map((s, i) =>
          `${i + 1}. ${s.title}\nHook: ${s.hook}\nContent preview: ${s.content.slice(0, 300)}...\nStocks: ${s.stockPicks?.join(", ") || "None"}\nKey Numbers: ${s.keyNumbers?.join(", ") || "None"}`
        ).join("\n\n");

        // Framing elements (derived from report content)
        const framing = {
          hook: `Open with a relatable FOMO moment about the main topic from this report: "${report.title}". Reference specific numbers or stocks if available.`,
          stakes: `Paint specific lifestyle outcomes related to the opportunities in this report. Use concrete examples, not abstract "wealth."`,
          urgencyClose: `Create urgency around timing, market conditions, or limited information access. Reference the report's key findings.`,
        };

        const systemPrompt = `You are writing a HIGH-CONVERTING financial advertorial (1200-1800 words) that follows a proven psychological structure. This is NOT a generic article. It must follow the EXACT structure below.

TODAY'S DATE: ${today}

SOURCE MATERIAL (use facts/numbers from this, but follow the STRUCTURE below):
Title: ${report.title}
Date: ${report.date}
Summary: ${report.executiveSummary}

SECTIONS:
${sectionSummaries}

=== REQUIRED ADVERTORIAL STRUCTURE ===

Your article MUST include these 12 sections IN THIS ORDER. Each section builds psychological momentum toward the CTA.

**SECTION 1: FOMO + REDEMPTION HOOK (2-3 short paragraphs)**
${framing.hook}
Immediately follow with hope/redemption: "But there's good news..." or "You're getting another chance..."
Goal: Acknowledge pain, then offer hope. Hook them emotionally in first 3 sentences.

**SECTION 2: CONTRARIAN REFRAME (1-2 paragraphs)**
Reframe the reader's timing. They think they're late. Show them they're early.
Example: "Here's what most investors are totally missing: [trend] is actually just getting started."
Goal: Remove the "I missed it" objection.

**SECTION 3: HISTORICAL ANALOGY (2-3 paragraphs)**
Compare the current moment to a past transformative period where early skeptics won big.
Example: "It feels late, just like the internet did around 2000. Back then, people thought they'd missed Yahoo and AOL. Then came Amazon, Google, Netflix."
Goal: Make the pattern feel familiar and repeatable.

**SECTION 4: FRAMEWORK/MENTAL MODEL (1-2 paragraphs)**
Give readers a simple framework to understand where we are.
Example: "Phase 1 was building the technology. Phase 2 is the global rollout. We're just entering Phase 2."
Goal: Create a "you are here" clarity that makes the opportunity feel tangible.

**SECTION 5: AUTHORITY STACKING (2-3 paragraphs)**
Include 2-3 quotes or references from credible third parties (CEOs, analysts, publications).
Goal: External validation, not just our opinion.

**SECTION 6: EMOTIONAL STAKES (1-2 paragraphs)**
${framing.stakes}
Paint specific lifestyle outcomes, not abstract "wealth."
Example: "The kind of returns that let you retire 5 years sooner. Pay off the house. Set up the kids."
Goal: Make it personal. Connect money to life.

**SECTION 7: THE NON-OBVIOUS EDGE (2-3 paragraphs)**
Explain why most investors will pick the wrong stocks even if they spot the trend.
Goal: Position your research as finding the non-obvious winners.

**SECTION 8: TRACK RECORD / CREDIBILITY (1-2 paragraphs)**
Reference past performance or credibility markers.
Goal: Prove this source has found winners before.

**SECTION 9: THE PIVOT (1 paragraph)**
Transition from past success to current opportunity.
Goal: Bridge from credibility to the new opportunity.

**SECTION 10: THE TEASE (3-4 paragraphs) - CRITICAL SECTION**
Describe the opportunity in compelling detail WITHOUT naming it directly.
- What it does (its role in the ecosystem)
- Why it's critical (who depends on it)
- Why it's defensible (moat: technology, patents, network effects)
- Why it's still undervalued (the gap between reality and market perception)
Goal: Create intense curiosity. Reader MUST click to learn the name.

**SECTION 11: THE OFFER STACK (1-2 paragraphs)**
List what they'll get (make it feel like a lot of value):
- The name and ticker of the company we've been describing
- Full research thesis on why we like it
- [X] additional stock picks positioned for this trend
- Complete research report on [topic]
Goal: Perceived value. Multiple deliverables.

**SECTION 12: URGENCY + CTA (1-2 paragraphs)**
${framing.urgencyClose}
End with clear call to action.

=== INLINE LINKS (for affiliate mode) ===
Include 5-7 inline links throughout the article at moments of peak curiosity.

=== STYLE RULES ===
- Write in first person plural ("we found", "our research")
- Ultra-short paragraphs (1-3 sentences max). Lots of white space.
- Specific numbers always beat vague claims
- NO em-dashes or en-dashes
- NO contrastive framing ("This isn't X. It's Y.")
- ASCII only

=== OUTPUT FORMAT ===
- Valid HTML only: <p>, <h2>, <a>, <ul>, <li> tags
- 1200-1800 words total

Respond in JSON: {"headline": "...", "content": "<p>...</p>..."}`;

        // Call Anthropic API with Claude Sonnet
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8000,
            messages: [
              {
                role: "user",
                content: systemPrompt,
              },
            ],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate advertorial", code: "ANTHROPIC_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.[0]?.text || "";

        if (!responseText) {
          return Response.json(
            { error: "Empty response from AI", code: "EMPTY_RESPONSE" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Parse the JSON response - handle markdown code blocks
        let advertorial: { headline: string; content: string };
        try {
          // Try to extract JSON from markdown code blocks if present
          let jsonText = responseText;

          // Remove ```json ... ``` or ``` ... ``` blocks
          const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim();
          }

          // Try to find JSON object if there's extra text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          advertorial = JSON.parse(jsonText);
        } catch {
          console.error("Failed to parse advertorial JSON:", responseText.slice(0, 500));
          return Response.json(
            { error: "Invalid JSON response from AI", code: "PARSE_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json(advertorial, { headers: corsHeaders });
      }

      // Generate advertorial copy operation - creates Meta ad copy for an advertorial
      if (path === "/api/operations/generate-advertorial-copy" && request.method === "POST") {
        const body = await request.json() as { advertorialContent?: string };

        if (!body.advertorialContent) {
          return Response.json(
            { error: "Missing advertorialContent field", code: "MISSING_CONTENT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const today = new Date().toISOString().split("T")[0];

        // Truncate content preview for the prompt
        const contentPreview = body.advertorialContent.slice(0, 8000);

        const systemPrompt = `You are creating Facebook/Meta ad copy for an advertorial article. Generate compelling ad copy for 4 psychological angles.

TODAY'S DATE: ${today}

ARTICLE CONTENT:
${contentPreview}

YOUR TASK:
Generate Meta ad copy for 4 angles. Each angle needs:
- Primary Text: ≤125 characters (the main ad text shown above the image)
- Headline: ≤255 characters (shown below the image, above the CTA)

ANGLES:
1. FEAR - Loss aversion, missing out, risks, what they don't know
2. GREED - Gains, benefits, what they'll get, opportunity
3. CURIOSITY - Intrigue, secrets, what's inside, surprising info
4. URGENCY - Time pressure, act now, limited window, don't wait

CHARACTER LIMITS (STRICT - ads will be rejected if exceeded):
- Primary Text: EXACTLY 125 characters or less
- Headline: EXACTLY 255 characters or less

STYLE GUIDELINES:
- Conversational, scroll-stopping tone (this is Facebook, not Google)
- Use sentence case (not Title Case)
- Can use questions to create curiosity
- No clickbait that doesn't deliver
- No ALL CAPS words
- No excessive punctuation (!!!)
- ASCII characters only, no emojis
- Professional but accessible

Respond in JSON with fear, greed, curiosity, urgency objects. Each object should have "primaryText" and "headline" fields.

Example format:
{
  "fear": {"primaryText": "...", "headline": "..."},
  "greed": {"primaryText": "...", "headline": "..."},
  "curiosity": {"primaryText": "...", "headline": "..."},
  "urgency": {"primaryText": "...", "headline": "..."}
}`;

        // Call Anthropic API with Claude Sonnet
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [
              {
                role: "user",
                content: systemPrompt,
              },
            ],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate advertorial copy", code: "ANTHROPIC_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.[0]?.text || "";

        if (!responseText) {
          return Response.json(
            { error: "Empty response from AI", code: "EMPTY_RESPONSE" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Parse the JSON response - handle markdown code blocks
        let adCopy: AdCopyResponse;
        try {
          let jsonText = responseText;

          // Remove ```json ... ``` or ``` ... ``` blocks
          const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim();
          }

          // Try to find JSON object if there's extra text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          adCopy = JSON.parse(jsonText);
        } catch {
          console.error("Failed to parse ad copy JSON:", responseText.slice(0, 500));
          return Response.json(
            { error: "Invalid JSON response from AI", code: "PARSE_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json(adCopy, { headers: corsHeaders });
      }

      // Generate visual concepts operation - uses Claude Haiku
      if (path === "/api/operations/generate-visual-concepts" && request.method === "POST") {
        const body = await request.json() as {
          report?: ReportObject;
          count?: number;
          mode?: "report" | "newsletter" | "advertorial" | "custom";
          advertorialContent?: string;
          customText?: string;
        };

        // Validate based on mode
        const mode = body.mode || "report";
        if (mode === "custom" && !body.customText) {
          return Response.json(
            { error: "Missing customText for custom mode", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }
        if (mode === "advertorial" && !body.advertorialContent) {
          return Response.json(
            { error: "Missing advertorialContent for advertorial mode", code: "MISSING_CONTENT" },
            { status: 400, headers: corsHeaders }
          );
        }
        if ((mode === "report" || mode === "newsletter") && !body.report) {
          return Response.json(
            { error: "Missing report field", code: "MISSING_REPORT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const count = body.count || 6;

        // Build prompt based on mode
        let prompt = "";

        if (mode === "report" || mode === "newsletter") {
          const report = body.report!;
          const stocksContext = report.sections?.flatMap(s => s.stockPicks || []).join(", ") || "Various stocks";
          const numbersContext = report.sections?.flatMap(s => s.keyNumbers || []).join(", ") || "Various data points";
          const titlesAndHooks = report.sections?.map(s => `- ${s.title}: ${s.hook}`).join("\n") || "";

          prompt = `Generate ${count} DIVERSE visual concepts for direct response ad images. These ads promote a free financial report.

REPORT: "${report.title || "Investment Report"}"
SUMMARY: ${report.executiveSummary || "Financial analysis and stock recommendations"}
STOCKS/TOPICS: ${stocksContext}
KEY NUMBERS: ${numbersContext}

SECTION HOOKS (what we're selling):
${titlesAndHooks}

YOUR MISSION: Create ${count} highly varied, scroll-stopping visual concepts. Mix these categories:

CATEGORY 1: ASPIRATIONAL PEOPLE (use 35% of concepts)
Real people who represent the TARGET AUDIENCE or DESIRED OUTCOME:
- Wealthy 55-65 year old man in expensive casual wear (cashmere, luxury watch), confident knowing expression
- Attractive professional woman (28-35) discovering something exciting on her phone/laptop
- Successful retired couple (60s) enjoying lifestyle that smart investing enabled
- Sharp executive (40-50s) with "I know something you don't" confident smirk
- Young professional woman leaning forward with genuine curiosity, direct eye contact
- Distinguished older gentleman with reading glasses, trustworthy advisor appearance
- Attractive woman (30s) with subtle, tasteful sophistication, professional but appealing

CATEGORY 2: TECH & INNOVATION (use 40% of concepts - IMPORTANT: make these look REAL)
Photorealistic technology imagery relevant to the report topics:
- Server rooms and data centers: person walking through rows of servers, dramatic scale
- GPU and chip close-ups: macro photography of actual NVIDIA chips, circuit boards, processors
- Network infrastructure: fiber optic cables with light, networking equipment
- Trading/analysis setups: multi-monitor workstations, professional trading desks
- AI infrastructure: cooling systems, power distribution, rack-mounted servers
- Person + tech interaction: engineer inspecting server, analyst pointing at multiple screens
- Premium devices: flagship laptop on executive desk, tablet showing abstract data viz
- Semiconductor manufacturing: clean room imagery, wafer inspection
- Optical technology: fiber optics, laser equipment, photonics hardware
- Data visualization: person reviewing holographic-style data, futuristic but grounded

CATEGORY 3: LIFESTYLE & ASPIRATION (use 25% of concepts)
The OUTCOME of smart investing:
- Morning routine with coffee and phone, beautiful home, calm successful energy
- First class travel, yacht club, golf course - person casually checking markets
- Home office with city view, person relaxed but engaged
- Beach house or vacation setting with laptop - financial freedom lifestyle

CRITICAL REQUIREMENTS:
1. Each concept is ONE clear focal point (person OR tech OR lifestyle scene)
2. NO text, charts, graphs, numbers, or UI elements in the image
3. VARY the demographics: mix ages (28-65), genders, and settings
4. VARY color palettes: warm golden tones, cool modern blues, bright aspirational whites, moody dramatic lighting
5. Make people RELATABLE yet ASPIRATIONAL - successful but approachable
6. For attractive women: tasteful, professional, confident - think successful entrepreneur not model
7. All human images must feel like REAL PHOTOGRAPHS not AI art

EMOTIONS TO TARGET (vary these):
- "I need to know what they know" (curiosity/FOMO)
- "This person figured it out" (aspiration/trust)
- "Something big is happening" (urgency/excitement)
- "I could have this lifestyle" (desire/motivation)
- "This looks credible and valuable" (trust/authority)

Respond in JSON:
{
  "concepts": [
    {
      "concept": "Highly detailed visual description with specific age, clothing, expression, setting, lighting",
      "targetEmotion": "The specific emotional response this should trigger",
      "colorScheme": "Specific color palette (NOT always blue - vary widely)"
    }
  ]
}`;
        } else if (mode === "advertorial") {
          // Advertorial mode
          prompt = `Generate ${count} DIVERSE visual concepts for direct response ad images. These ads promote a financial advertorial article.

ARTICLE CONTENT:
${body.advertorialContent?.slice(0, 8000)}

YOUR MISSION: Create ${count} highly varied, scroll-stopping visual concepts based on the article content. Mix these categories:

CATEGORY 1: ASPIRATIONAL PEOPLE (use 35% of concepts)
Real people who represent the TARGET AUDIENCE or DESIRED OUTCOME:
- Wealthy 55-65 year old man in expensive casual wear (cashmere, luxury watch), confident knowing expression
- Attractive professional woman (28-35) discovering something exciting on her phone/laptop
- Successful retired couple (60s) enjoying lifestyle that smart investing enabled
- Sharp executive (40-50s) with "I know something you don't" confident smirk
- Young professional woman leaning forward with genuine curiosity, direct eye contact

CATEGORY 2: TECH & INNOVATION (use 40% of concepts - make these look REAL)
Photorealistic technology imagery relevant to the article topics:
- Server rooms, data centers, chip close-ups, network infrastructure
- Trading setups, professional workstations
- Person + tech interaction scenes

CATEGORY 3: LIFESTYLE & ASPIRATION (use 25% of concepts)
The OUTCOME of smart investing:
- Morning routines in beautiful homes, first class travel, home offices with views

CRITICAL REQUIREMENTS:
1. Each concept is ONE clear focal point
2. NO text, charts, graphs, numbers, or UI elements in the image
3. VARY demographics and color palettes
4. All human images must feel like REAL PHOTOGRAPHS not AI art

Respond in JSON:
{
  "concepts": [
    {
      "concept": "Highly detailed visual description",
      "targetEmotion": "The specific emotional response",
      "colorScheme": "Specific color palette"
    }
  ]
}`;
        } else if (mode === "custom") {
          // Custom mode - accept any text
          prompt = `Generate ${count} DIVERSE visual concepts for ad images based on the following content.

CONTENT:
${body.customText?.slice(0, 10000)}

YOUR MISSION: Create ${count} highly varied, scroll-stopping visual concepts that relate to the content above. The concepts should work as compelling ad images.

MIX THESE TYPES OF VISUALS:
1. PEOPLE (35%): Real, relatable people who represent the target audience or desired outcome
   - Vary ages (25-65), genders, and settings
   - Show genuine emotions: curiosity, confidence, excitement, satisfaction
   - Professional but approachable appearance

2. PRODUCT/TOPIC IMAGERY (40%): Photorealistic visuals directly relevant to the content
   - If tech-related: devices, equipment, infrastructure
   - If health-related: wellness scenes, natural ingredients, lifestyle
   - If finance-related: success imagery, professional settings
   - If education-related: learning environments, achievement moments

3. LIFESTYLE & ASPIRATION (25%): The positive outcome or transformation
   - Success and achievement moments
   - Improved quality of life scenes
   - Before/after implications (show the "after")

CRITICAL REQUIREMENTS:
1. Each concept is ONE clear focal point
2. NO text, charts, graphs, numbers, or UI elements in the image
3. VARY demographics and color palettes widely
4. All human images must feel like REAL PHOTOGRAPHS not AI art
5. Concepts should evoke emotional responses: curiosity, desire, trust, urgency

Respond in JSON:
{
  "concepts": [
    {
      "concept": "Highly detailed visual description with specific details about subject, setting, lighting, mood",
      "targetEmotion": "The specific emotional response this should trigger",
      "colorScheme": "Specific color palette"
    }
  ]
}`;
        }

        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate visual concepts", code: "ANTHROPIC_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.[0]?.text || "";

        // Parse JSON from response (handle markdown code blocks and extra text)
        let jsonStr = responseText;

        // Remove ```json ... ``` or ``` ... ``` blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }

        // Try to find JSON object if there's extra text
        const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }

        try {
          const parsed = JSON.parse(jsonStr) as { concepts: Array<{ concept: string; targetEmotion: string; colorScheme: string }> };
          return Response.json({ concepts: parsed.concepts }, { headers: corsHeaders });
        } catch {
          console.error("Failed to parse concepts JSON:", responseText.slice(0, 500));
          return Response.json(
            { error: "Failed to parse response", code: "PARSE_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // Generate Meta headlines operation - creates ad copy from any text
      if (path === "/api/operations/generate-meta-headlines" && request.method === "POST") {
        const body = await request.json() as { text?: string };

        if (!body.text) {
          return Response.json(
            { error: "Missing text field", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const today = new Date().toISOString().split("T")[0];

        // Truncate content for the prompt
        const contentPreview = body.text.slice(0, 10000);

        const prompt = `You are a direct response copywriter creating Facebook/Meta ad copy. Generate scroll-stopping ad copy based on this content.

TODAY'S DATE: ${today}

CONTENT:
${contentPreview}

YOUR TASK:
Generate 5 Primary Texts and 5 Headlines for Meta ads.

PRIMARY TEXT (shown above the image):
- EXACTLY 125 characters or less each
- The hook that stops the scroll
- Create curiosity, urgency, or emotional pull
- Mix different angles: fear of missing out, greed/opportunity, curiosity/secrets, urgency/time pressure, social proof

HEADLINE (shown below the image, above the CTA button):
- EXACTLY 255 characters or less each
- Expands on the primary text
- Reinforces the value proposition
- Creates desire to click

STYLE GUIDELINES (CRITICAL):
- Conversational, not corporate
- Sentence case (not Title Case)
- Questions work great for curiosity
- Specific numbers and details beat vague claims
- No clickbait that doesn't deliver
- No ALL CAPS words
- No excessive punctuation (!!!)
- ASCII characters only, no emojis
- Professional but accessible
- Assume the reader is skeptical but interested

WHAT MAKES META COPY WORK:
- Pattern interrupts ("Wait, did you know...")
- Direct address ("You've probably noticed...")
- Contrarian takes ("Everyone's wrong about...")
- Specificity ("The 3 things most people miss...")
- Implied insider knowledge ("What experts aren't telling you...")
- Relatable problems ("Tired of...")

Respond in JSON:
{
  "primaryTexts": ["text1", "text2", "text3", "text4", "text5"],
  "headlines": ["headline1", "headline2", "headline3", "headline4", "headline5"]
}

IMPORTANT: Count characters carefully. Primary texts must be ≤125 chars. Headlines must be ≤255 chars. Ads get rejected if limits are exceeded.`;

        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate headlines", code: "ANTHROPIC_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.[0]?.text || "";

        // Parse JSON from response
        let jsonStr = responseText;
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
        const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }

        try {
          const parsed = JSON.parse(jsonStr) as { primaryTexts: string[]; headlines: string[] };
          return Response.json({
            primaryTexts: parsed.primaryTexts || [],
            headlines: parsed.headlines || []
          }, { headers: corsHeaders });
        } catch {
          console.error("Failed to parse headlines JSON:", responseText.slice(0, 500));
          return Response.json(
            { error: "Failed to parse response", code: "PARSE_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // Generate YouTube Thumbnails - generates actual images from transcript + reference photo
      if (path === "/api/operations/generate-youtube-thumbnails" && request.method === "POST") {
        const body = await request.json() as {
          text?: string;
          referenceImageUrl?: string;
          episodeTitle?: string;
          model?: string; // gemini-3.1-flash (default), gemini-pro, gemini-flash
        };

        if (!body.text) {
          return Response.json(
            { error: "Missing text field", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();
        const geminiKey = await env.FWP_GEMINI_API_KEY.get();

        // Step 1: If reference image provided, fetch and convert to base64 for direct use
        let referenceImageBase64 = "";
        let referenceImageMimeType = "image/jpeg";

        if (body.referenceImageUrl) {
          if (body.referenceImageUrl.startsWith("data:")) {
            const mimeMatch = body.referenceImageUrl.match(/^data:([^;]+);base64,/);
            if (mimeMatch) {
              referenceImageMimeType = mimeMatch[1];
            }
            referenceImageBase64 = body.referenceImageUrl.split(",")[1];
          } else if (body.referenceImageUrl.startsWith("http")) {
            console.log("Fetching reference image from:", body.referenceImageUrl);
            try {
              const imgResponse = await fetch(body.referenceImageUrl);
              if (imgResponse.ok) {
                const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
                referenceImageMimeType = contentType.split(";")[0];
                const arrayBuffer = await imgResponse.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                let binary = "";
                for (let i = 0; i < uint8Array.length; i++) {
                  binary += String.fromCharCode(uint8Array[i]);
                }
                referenceImageBase64 = btoa(binary);
                console.log("Fetched reference image, size:", uint8Array.length, "mime:", referenceImageMimeType);
              } else {
                console.error("Failed to fetch reference image:", imgResponse.status);
              }
            } catch (err) {
              console.error("Error fetching reference image:", err);
            }
          }
        }

        // Step 2: Analyze transcript and generate thumbnail concepts with specific tech/topics
        const contentPreview = body.text.slice(0, 10000);
        const episodeContext = body.episodeTitle ? `\nEPISODE TITLE: ${body.episodeTitle}` : "";
        const hasReferenceImage = !!referenceImageBase64;

        const referenceImageNote = hasReferenceImage
          ? `\n\nIMPORTANT: A reference photo of the host will be provided. The generated image should feature THIS EXACT PERSON from the reference photo, placed in the scene you describe.`
          : "";

        const conceptPrompt = `You are a YouTube thumbnail strategist. Analyze this podcast transcript and create 5 thumbnail concepts.
${episodeContext}

TRANSCRIPT:
${contentPreview}
${referenceImageNote}

YOUR TASK:
1. Identify the 5 most interesting/clickable SPECIFIC technologies, products, concepts, or topics mentioned in the transcript.
2. For each, create a thumbnail concept showing the host interacting with that specific thing.

CRITICAL RULES:
- Each thumbnail must feature a SPECIFIC technology, product, or concept from the transcript (not generic "tech" or "innovation")
- The host should be interacting with, standing near, or reacting to the specific tech
- Use dramatic lighting and high contrast backgrounds
- Describe the scene, background, and how the tech appears - the reference photo will provide the person

For each concept provide:
1. specific_topic: The exact technology/product/concept from the transcript (be specific - not "AI" but "GPT-4 Turbo" or "Tesla's Optimus robot")
2. image_prompt: A detailed prompt describing the scene. Focus on: the specific tech/product being featured, the background/setting, lighting, mood, and how the person should be posed/interacting with the tech. DO NOT describe the person's appearance - the reference image provides that.
3. overlay_text: 3-5 words for the thumbnail text overlay
4. hook_angle: curiosity, fear, greed, controversy, etc.

Respond in JSON:
{
  "concepts": [
    {
      "specific_topic": "...",
      "image_prompt": "...",
      "overlay_text": "...",
      "hook_angle": "..."
    }
  ]
}`;

        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 4000,
            messages: [{ role: "user", content: conceptPrompt }],
          }),
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API error:", errorText);
          return Response.json(
            { error: "Failed to generate concepts", code: "ANTHROPIC_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const anthropicData = await anthropicResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = anthropicData.content?.[0]?.text || "";

        // Parse JSON from response
        let jsonStr = responseText;
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
        const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }

        let concepts: Array<{
          specific_topic: string;
          image_prompt: string;
          overlay_text: string;
          hook_angle: string;
        }>;

        try {
          const parsed = JSON.parse(jsonStr);
          concepts = parsed.concepts || [];
        } catch {
          console.error("Failed to parse concepts JSON:", responseText.slice(0, 500));
          return Response.json(
            { error: "Failed to parse concepts", code: "PARSE_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Step 3: Generate images for each concept
        const thumbnails: Array<{
          specific_topic: string;
          overlay_text: string;
          hook_angle: string;
          imageUrl: string;
        }> = [];

        for (const concept of concepts.slice(0, 5)) {
          try {
            // Add YouTube thumbnail-specific styling to the prompt
            const enhancedPrompt = hasReferenceImage
              ? `Using the provided reference photo of the person, create a YouTube thumbnail where this EXACT person appears in the following scene:

${concept.image_prompt}

CRITICAL REQUIREMENTS:
- The person must look EXACTLY like the reference photo - same face, same features, completely photorealistic
- The person's body, arms, hands, and proportions must match their face from the reference photo. If the person has a larger face, their body should be proportionally larger. If leaner, their body should be proportionally leaner. The whole person should look like one consistent real human.
- The person must NOT look like a cartoon, illustration, or have any AI/synthetic appearance
- The person should look like a real photograph of a real human
- Dramatic lighting and high contrast for the scene, but the person remains photorealistic

Style: Professional YouTube thumbnail, dramatic lighting, high contrast, vibrant colors, 16:9 aspect ratio. The PERSON must be photorealistic like the reference photo.`
              : `YouTube thumbnail style, photorealistic, dramatic lighting, high contrast, bold colors, 16:9 aspect ratio:

${concept.image_prompt}

Style: Professional YouTube thumbnail, eye-catching, vibrant colors that pop, cinematic lighting, shallow depth of field on the main subject.`;

            // Select Gemini image model
            let geminiImageModel: string;
            const selectedModel = body.model || "gemini-3.1-flash";
            if (selectedModel === "gemini-pro") {
              geminiImageModel = "gemini-3-pro-image-preview";
            } else if (selectedModel === "gemini-3.1-flash") {
              geminiImageModel = "gemini-3.1-flash-image-preview";
            } else {
              geminiImageModel = "gemini-2.5-flash-image";
            }

            console.log("Generating thumbnail for:", concept.specific_topic, "with model:", geminiImageModel, "hasReference:", hasReferenceImage);

            // Build the parts array - include reference image if available
            const contentParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

            // Add reference image first if available
            if (hasReferenceImage) {
              contentParts.push({
                inlineData: {
                  mimeType: referenceImageMimeType,
                  data: referenceImageBase64
                }
              });
            }

            // Add the text prompt
            contentParts.push({ text: enhancedPrompt });

            const imageResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${geminiImageModel}:generateContent`,
              {
                method: "POST",
                headers: {
                  "x-goog-api-key": geminiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contents: [{ parts: contentParts }],
                  generationConfig: {
                    responseModalities: ["IMAGE"],
                    imageConfig: {
                      aspectRatio: "16:9",
                    },
                  },
                }),
              }
            );

            if (!imageResponse.ok) {
              const errorText = await imageResponse.text();
              console.error("Image generation failed for concept:", concept.specific_topic, errorText);
              // Continue with other concepts even if one fails
              continue;
            }

            const imageData = await imageResponse.json() as {
              candidates?: Array<{
                content?: {
                  parts?: Array<{
                    inlineData?: { mimeType?: string; data?: string };
                    inline_data?: { mime_type?: string; data?: string };
                  }>;
                };
              }>;
            };

            const parts = imageData.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find(p => p.inlineData || p.inline_data);
            const inlineData = (imagePart?.inlineData || imagePart?.inline_data) as { mimeType?: string; mime_type?: string; data?: string } | undefined;
            const b64 = inlineData?.data;
            const imgMimeType = inlineData?.mimeType || inlineData?.mime_type || "image/png";

            if (b64) {
              thumbnails.push({
                specific_topic: concept.specific_topic,
                overlay_text: concept.overlay_text,
                hook_angle: concept.hook_angle,
                imageUrl: `data:${imgMimeType};base64,${b64}`,
              });
            }
          } catch (err) {
            console.error("Error generating image:", err);
            // Continue with other concepts
          }
        }

        return Response.json({
          thumbnails
        }, { headers: corsHeaders });
      }

      // Summarize operation - uses Gemini Flash (cheap, fast)
      if (path === "/api/operations/summarize" && request.method === "POST") {
        const body = await request.json() as { text?: string; maxLength?: number };

        if (!body.text) {
          return Response.json(
            { error: "Missing text field", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiKey = await env.FWP_GEMINI_API_KEY.get();
        const maxLength = body.maxLength || 200;

        const prompt = `Summarize the following text in ${maxLength} words or less. Be concise and capture the key points. Output only the summary, no explanations.

TEXT:
${body.text.slice(0, 50000)}`;

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          return Response.json(
            { error: "Failed to summarize text", code: "GEMINI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const summary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return Response.json({ summary }, { headers: corsHeaders });
      }

      // Extract key points operation - uses Gemini Flash
      if (path === "/api/operations/extract-key-points" && request.method === "POST") {
        const body = await request.json() as { text?: string; maxPoints?: number };

        if (!body.text) {
          return Response.json(
            { error: "Missing text field", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiKey = await env.FWP_GEMINI_API_KEY.get();
        const maxPoints = body.maxPoints || 5;

        const prompt = `Extract the ${maxPoints} most important key points from the following text. Return them as a JSON array of strings.

TEXT:
${body.text.slice(0, 50000)}

Respond in this exact JSON format:
{ "points": ["Point 1", "Point 2", "Point 3"] }`;

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          return Response.json(
            { error: "Failed to extract key points", code: "GEMINI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON from response (handle markdown code blocks and extra text)
        let jsonStr = responseText;

        // Remove ```json ... ``` or ``` ... ``` blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }

        // Try to find JSON object if there's extra text
        const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }

        try {
          const parsed = JSON.parse(jsonStr) as { points: string[] };
          return Response.json({ points: parsed.points }, { headers: corsHeaders });
        } catch {
          // Fallback: try to extract points from plain text
          const lines = responseText.split("\n").filter(l => l.trim().length > 0);
          return Response.json({ points: lines.slice(0, maxPoints) }, { headers: corsHeaders });
        }
      }

      // Fetch podcast audio operation - extracts audio URL from podcast pages
      if (path === "/api/operations/podcast-episode" && request.method === "POST") {
        const body = await request.json() as { url?: string };

        if (!body.url) {
          return Response.json(
            { error: "Missing url field", code: "MISSING_URL" },
            { status: 400, headers: corsHeaders }
          );
        }

        const episodeUrl = body.url;

        // If it's already a direct audio URL, return it directly
        if (episodeUrl.match(/\.(mp3|m4a|wav|ogg|aac)(\?|$)/i)) {
          // Try to extract title from URL
          const urlParts = episodeUrl.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0];
          const title = filename.replace(/\.(mp3|m4a|wav|ogg|aac)$/i, '').replace(/-/g, ' ');

          return Response.json({
            audioUrl: episodeUrl,
            title: title || "Podcast Episode"
          }, { headers: corsHeaders });
        }

        // Fetch the page
        let pageHtml = "";
        let fetchError = "";

        try {
          const pageResponse = await fetch(episodeUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
            },
          });

          if (!pageResponse.ok) {
            fetchError = `HTTP ${pageResponse.status}: ${pageResponse.statusText}`;
          } else {
            pageHtml = await pageResponse.text();
          }
        } catch (err) {
          fetchError = err instanceof Error ? err.message : "Fetch failed";
        }

        if (fetchError || !pageHtml) {
          return Response.json(
            { error: `Failed to fetch page: ${fetchError}`, code: "FETCH_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Extract audio URL from common patterns
        let audioUrl = "";
        let title = "";

        // Try og:audio meta tag
        const ogAudioMatch = pageHtml.match(/<meta\s+property="og:audio"\s+content="([^"]+)"/i);
        if (ogAudioMatch) {
          audioUrl = ogAudioMatch[1];
        }

        // Try twitter:player:stream meta tag
        if (!audioUrl) {
          const twitterMatch = pageHtml.match(/<meta\s+name="twitter:player:stream"\s+content="([^"]+)"/i);
          if (twitterMatch) {
            audioUrl = twitterMatch[1];
          }
        }

        // Try audio tag src
        if (!audioUrl) {
          const audioSrcMatch = pageHtml.match(/<audio[^>]*src="([^"]+\.mp3[^"]*)"/i);
          if (audioSrcMatch) {
            audioUrl = audioSrcMatch[1];
          }
        }

        // Try source tag inside audio
        if (!audioUrl) {
          const sourceMatch = pageHtml.match(/<source[^>]*src="([^"]+\.mp3[^"]*)"/i);
          if (sourceMatch) {
            audioUrl = sourceMatch[1];
          }
        }

        // Try data-src pattern (common in podcast players)
        if (!audioUrl) {
          const dataSrcMatch = pageHtml.match(/data-(?:audio-)?src="([^"]+\.mp3[^"]*)"/i);
          if (dataSrcMatch) {
            audioUrl = dataSrcMatch[1];
          }
        }

        // Try enclosure or direct mp3 link
        if (!audioUrl) {
          const mp3Match = pageHtml.match(/"(https?:\/\/[^"]+\.mp3[^"]*)"/i);
          if (mp3Match) {
            audioUrl = mp3Match[1];
          }
        }

        // Extract title from og:title or title tag
        const ogTitleMatch = pageHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch) {
          title = ogTitleMatch[1];
        } else {
          const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            title = titleMatch[1];
          }
        }

        if (!audioUrl) {
          return Response.json(
            { error: "Could not find audio URL on page", code: "NO_AUDIO" },
            { status: 404, headers: corsHeaders }
          );
        }

        // Clean up HTML entities in title
        title = title
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        return Response.json({ audioUrl, title }, { headers: corsHeaders });
      }

      // Parse RSS operation - parses podcast RSS feeds
      if (path === "/api/operations/podcast-rss" && request.method === "POST") {
        const body = await request.json() as { feedUrl?: string };

        if (!body.feedUrl) {
          return Response.json(
            { error: "Missing feedUrl field", code: "MISSING_URL" },
            { status: 400, headers: corsHeaders }
          );
        }

        // Fetch the RSS feed
        let rssXml = "";
        let fetchError = "";

        try {
          const rssResponse = await fetch(body.feedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; FlowOps/1.0)",
              "Accept": "application/rss+xml, application/xml, text/xml, */*",
            },
          });

          if (!rssResponse.ok) {
            fetchError = `HTTP ${rssResponse.status}: ${rssResponse.statusText}`;
          } else {
            rssXml = await rssResponse.text();
          }
        } catch (err) {
          fetchError = err instanceof Error ? err.message : "Fetch failed";
        }

        if (fetchError || !rssXml) {
          return Response.json(
            { error: `Failed to fetch RSS: ${fetchError}`, code: "FETCH_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        // Parse RSS items using regex (Workers don't have DOMParser)
        const episodes: Array<{ title: string; audioUrl: string; pubDate: string; description: string }> = [];

        // Match all <item> blocks
        const itemMatches = rssXml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);

        for (const itemMatch of itemMatches) {
          const itemContent = itemMatch[1];

          // Extract title
          const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : "";

          // Extract audio URL from enclosure
          const enclosureMatch = itemContent.match(/<enclosure[^>]+url="([^"]+)"/i);
          const audioUrl = enclosureMatch ? enclosureMatch[1] : "";

          // Extract pubDate
          const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/i);
          const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";

          // Extract description (prefer itunes:summary, fallback to description)
          let description = "";
          const itunesSummaryMatch = itemContent.match(/<itunes:summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/itunes:summary>/i);
          if (itunesSummaryMatch) {
            description = itunesSummaryMatch[1].trim();
          } else {
            const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            if (descMatch) {
              description = descMatch[1].trim();
            }
          }

          // Strip HTML from description
          description = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

          if (title && audioUrl) {
            episodes.push({ title, audioUrl, pubDate, description });
          }
        }

        // Extract feed title
        let feedTitle = "Podcast Feed";
        const feedTitleMatch = rssXml.match(/<channel[^>]*>[\s\S]*?<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i);
        if (feedTitleMatch) {
          feedTitle = feedTitleMatch[1].trim();
        }

        return Response.json({ feedTitle, episodes }, { headers: corsHeaders });
      }

      // Chat endpoint - natural language to flow actions via Claude
      if (path === "/api/chat" && request.method === "POST") {
        const body = await request.json() as {
          message?: string;
          currentNodes?: Array<{ id: string; type: string; position: { x: number; y: number } }>;
          currentEdges?: Array<{ source: string; target: string }>;
        };

        if (!body.message) {
          return Response.json(
            { error: "Missing message", code: "MISSING_MESSAGE" },
            { status: 400, headers: corsHeaders }
          );
        }

        const anthropicKey = await env.FWP_ANTHROPIC_API_KEY.get();

        // System prompt that teaches Claude about all available nodes and presets
        const systemPrompt = `You are a helpful assistant for a visual node-based editor called flow-ops. Users describe what they want to build, and you return structured JSON actions to create nodes and connect them.

## Available Node Types

### Source Nodes (inputs that provide data)
- textInput: Text input box. Fields: { value: "the text" }
- urlInput: Fetches a URL and extracts article text. Fields: { value: "https://..." }
- imageUpload: Upload an image. Fields: { imageUrl: "" }
- audioUpload: Upload audio. Fields: { audioBase64: "", mimeType: "", filename: "" }
- videoUpload: Upload video. Fields: { videoBase64: "", mimeType: "", filename: "" }
- pdfUpload: Upload PDF. Fields: { pdfBase64: "", filename: "" }
- podcastRSS: Podcast (RSS feed or direct episode link). Fields: { feedUrl: "https://..." }

### Operation Nodes (process data)
- summarize: Summarizes text. Fields: { inputValue: "" }
- extractKeyPoints: Extracts bullet points. Fields: { inputValue: "" }
- transcribe: Transcribes audio to text. Fields: { inputValue: "" }
- iphonePhoto: Generates a photorealistic image from text. Fields: { inputValue: "", extraInstructions: "" }
- animate: Converts image to video. Fields: { imageUrl: "", inputValue: "" }
- crop: Crops image/video to aspect ratio. Fields: { imageUrl: "", videoUrl: "" }
- textOverlay: Adds text on images. Fields: { imageUrl: "", inputValue: "" }
- generateReport: Creates a structured report from transcript. Fields: { inputValue: "" }
- generateCopy: Generates ad copy from report. Fields: { inputValue: "" }
- generateLandingPages: Generates landing pages from report. Fields: { inputValue: "" }
- generateAdvertorial: Generates advertorial from report. Fields: { inputValue: "" }
- generateAdvertorialCopy: Generates Meta ad copy from advertorial. Fields: { inputValue: "" }
- generateVisualConcepts: Generates image concepts from report. Fields: { inputValue: "" }
- generateMetaHeadlines: Generates Meta ad headlines. Fields: { inputValue: "" }
- generateYouTubeThumbnails: Generates YouTube thumbnail images. Fields: { inputValue: "" }

### Output Nodes (display results)
- imageOutput: Shows image or video result. Fields: { imageUrl: "", prompt: "" }
- reportPreview: Shows formatted report. Fields: { report: null }
- copyExport: Shows ad copy for export. Fields: { copy: null }
- landingPagePreview: Shows landing page preview. Fields: { landingPages: null }
- advertorialPreview: Shows advertorial preview. Fields: { headline: "", content: "" }
- imageGallery: Shows multiple images. Fields: { images: [] }

### Utility Nodes
- splitReportSections: Splits report into sections. Fields: { report: null }
- merge: Merges multiple inputs. Fields: { inputs: [] }
- filterByAngle: Filters by emotional angle. Fields: { inputValue: null, angle: "fear" }
- platformToggle: Switches between platforms. Fields: { platform: "google" }

## Available Presets
1. "Text to Photo" - Text Input > Generate Image > Output
2. "URL to Photo" - URL Input > Generate Image > Output
3. "Photo to Video" - Image Upload > Animate > Output
4. "Text to Video" - Text Input > Generate Image > Animate > Output
5. "Video for Meta" - Text Input > Generate Image > Animate > Crop > Output
6. "Podcast to Report" - Podcast RSS > Transcribe > Generate Report > Report Preview
7. "FWP Pipeline" - Full podcast to ads pipeline

## Response Format
Return ONLY valid JSON (no markdown, no explanation outside the JSON). The format:
{
  "actions": [
    { "type": "addNode", "nodeType": "textInput", "data": { "value": "some text" }, "label": "Text Input" },
    { "type": "addNode", "nodeType": "iphonePhoto", "data": {}, "label": "Generate Image" },
    { "type": "connectNodes", "sourceIndex": 0, "targetIndex": 1 },
    { "type": "loadPreset", "presetName": "Text to Photo" }
  ],
  "reply": "Here is what I set up for you."
}

## Rules
- sourceIndex and targetIndex in connectNodes refer to the 0-based index of addNode actions in the SAME response
- When adding a chain of nodes, connect them in order
- If the user asks for a preset by name, use loadPreset instead of manually adding nodes
- IMPORTANT: Always fill in the data fields with any content the user provides. Examples:
  - "transcribe from fool.com" -> urlInput data should be { "value": "https://www.fool.com" }
  - "summarize this text: hello world" -> textInput data should be { "value": "hello world" }
  - "generate a photo of a sunset" -> iphonePhoto data should be { "extraInstructions": "a sunset" }, or if standalone, textInput with { "value": "a sunset" }
  - "podcast from https://feed.example.com/rss" -> podcastRSS data should be { "feedUrl": "https://feed.example.com/rss" }
- For URLs, always include the full URL with https:// prefix. If user says "fool.com", use "https://www.fool.com"
- Keep reply short and helpful. Do not use emdashes. Use periods, commas, or colons instead.
- If you do not understand the request, return an empty actions array and explain in the reply.
- Always include an output node at the end of a chain when appropriate.`;

        // Call Claude Haiku 4.5
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: `Current canvas has ${(body.currentNodes || []).length} nodes and ${(body.currentEdges || []).length} edges.${(body.currentNodes || []).length > 0 ? `\nExisting node types: ${(body.currentNodes || []).map(n => n.type).join(", ")}` : ""}\n\nUser request: ${body.message}`,
              },
            ],
          }),
        });

        if (!claudeResponse.ok) {
          const errText = await claudeResponse.text();
          console.error("Claude API error:", errText);
          return Response.json(
            { error: "Failed to get AI response", code: "AI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const claudeData = await claudeResponse.json() as {
          content?: Array<{ type: string; text?: string }>;
        };

        const responseText = claudeData.content?.[0]?.text || "";

        // Parse JSON from AI response (handle markdown code blocks and extra text)
        let jsonStr = responseText;

        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }

        const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }

        try {
          const result = JSON.parse(jsonStr);
          return Response.json(result, { headers: corsHeaders });
        } catch {
          console.error("Failed to parse chat JSON:", responseText.slice(0, 500));
          // Return the raw text as a reply if JSON parsing fails
          return Response.json(
            {
              actions: [],
              reply: "I had trouble processing that. Could you try rephrasing your request?",
            },
            { headers: corsHeaders }
          );
        }
      }

      // 404 for unknown routes
      return Response.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );

    } catch (err) {
      console.error("Handler failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return Response.json(
        { error: message, code: "INTERNAL_ERROR" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
