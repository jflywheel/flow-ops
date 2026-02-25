// Worker backend for flow-ops
// Handles auth and LLM operation endpoints

interface SecretStoreSecret {
  get(): Promise<string>;
}

interface Env {
  FWP_GEMINI_API_KEY: SecretStoreSecret;
  FWP_OPENAI_API_KEY: SecretStoreSecret;
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
        const geminiImageModel = selectedModel === "gemini-pro"
          ? "gemini-3-pro-image-preview"
          : "gemini-2.5-flash-image";

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
        const inlineData = imagePart?.inlineData || imagePart?.inline_data;
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

      // Text enhance operation - rewrites/improves text using Gemini
      if (path === "/api/operations/enhance-text" && request.method === "POST") {
        const body = await request.json() as { text?: string; style?: string };

        if (!body.text) {
          return Response.json(
            { error: "Missing text field", code: "MISSING_TEXT" },
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiKey = await env.FWP_GEMINI_API_KEY.get();
        const extraInstructions = body.style || "";

        const extraPart = extraInstructions
          ? `\n\nAdditional instructions: ${extraInstructions}`
          : "";

        const systemPrompt = `You are a creative writing assistant. Take the user's text and enhance it to be more vivid and detailed. Keep the core meaning but make it more evocative and interesting. Output only the enhanced text, no explanations.${extraPart}`;

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nOriginal text: ${body.text}` }] }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          return Response.json(
            { error: "Failed to enhance text", code: "GEMINI_ERROR" },
            { status: 500, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const result = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return Response.json({ result }, { headers: corsHeaders });
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
