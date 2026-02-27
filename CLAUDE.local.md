# flow-ops

FWP project (uses FWP_ prefixed secrets, pushes to jflywheel GitHub)

## What This Is
Visual node-based editor for chaining LLM operations on data sources.
Built with React Flow, hosted on Cloudflare.

## Architecture
- Frontend: React + Vite + React Flow on Cloudflare Pages
- Backend: Cloudflare Worker at flow-ops.helmsdeep.workers.dev
- Auth: dog/dog with JWT token

## Secrets
- FWP_GEMINI_API_KEY from Secrets Store

## Node Types

### Source Nodes
- **Text Input** - Textarea for entering/pasting text
- **URL Input** - Fetches URL, extracts article text via Gemini (optional instructions)

### Operation Nodes
- **iPhone Photo** - Generates photorealistic image from text using Gemini image models
  - Models: Gemini 2.5 Flash Image, Gemini 3 Pro Image
  - Options: extra instructions, reference image URL, format (square/landscape/portrait)
- **Animate** - Converts image to video using Veo
  - Models: Veo 2.0, Veo 3.1 Fast, Veo 3.1 Standard
  - Options: prompt, aspect ratio, duration
- **Crop** - Client-side crop for aspect ratios (4:5, 1:1, 16:9, 9:16)
- **Text Overlay** - Adds text on images (not fully implemented)
- **Enhance Text** - Rewrites text (backend exists)

### Output Nodes
- **Output** - Displays final result (image or video)

## Preset Flows
Hardcoded presets (not user-saved), starts with blank canvas:
1. Text to Photo
2. URL to Photo
3. Photo to Video
4. Text to Video
5. Video for Meta (includes 4:5 crop)

## API Endpoints

```
POST /api/login                    - dog/dog auth, returns JWT
GET  /api/me                       - check auth
POST /api/operations/iphone-photo  - Gemini image generation
POST /api/operations/animate       - Veo video generation (async polling)
POST /api/operations/enhance-text  - Text rewriting
POST /api/operations/text-overlay  - Image text overlay
POST /api/operations/fetch-url     - URL fetch + article extraction
```

## Deployment
- Worker: `wrangler deploy` from root
- Frontend: `cd frontend && npm run build && wrangler pages deploy dist`

## Development Patterns

### Parsing JSON from LLM Responses

LLMs (Claude, Gemini) often wrap JSON in markdown code blocks or add explanatory text. Always use this robust parsing pattern when expecting JSON from an AI response:

```typescript
// Parse JSON from AI response (handle markdown code blocks and extra text)
let jsonStr = responseText;

// Step 1: Remove ```json ... ``` or ``` ... ``` blocks
const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
if (codeBlockMatch) {
  jsonStr = codeBlockMatch[1].trim();
}

// Step 2: Extract JSON object if there's extra text around it
const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
if (jsonObjMatch) {
  jsonStr = jsonObjMatch[0];
}

// Step 3: Parse with try/catch and log truncated response on failure
try {
  const result = JSON.parse(jsonStr);
  // use result...
} catch {
  console.error("Failed to parse JSON:", responseText.slice(0, 500));
  return Response.json(
    { error: "Invalid JSON response from AI", code: "PARSE_ERROR" },
    { status: 500, headers: corsHeaders }
  );
}
```

### Data Propagation Priority

When data flows between nodes via edges, `inputValue` is set based on this priority (highest first):
1. `report` - structured report output (serialized to JSON)
2. `summary` - summarized text
3. `outputValue` - generic output
4. `transcript` - transcription text
5. `value` - input value
6. `articleText` - extracted article text

This ensures generated outputs (like reports) take precedence over their inputs (like transcripts) when both exist on a node.

### Handling Report Objects in Nodes

When a node can receive either plain text OR a report object, use this pattern:
```typescript
const getText = (): string | null => {
  try {
    const parsed = JSON.parse(data.inputValue);
    // Handle report object
    if (parsed.executiveSummary || parsed.sections) {
      const parts: string[] = [];
      if (parsed.executiveSummary) parts.push(parsed.executiveSummary);
      if (parsed.sections) {
        for (const section of parsed.sections) {
          if (section.content) parts.push(section.content);
        }
      }
      return parts.join("\n\n");
    }
    // Handle other formats...
  } catch {
    // Not JSON, use as-is
  }
  return data.inputValue;
};
```

### Node Component Patterns

When creating new operation nodes in `frontend/src/components/nodes/`:

1. **State management**: Use useState for loading, error, result, and modalOpen states
2. **Input indicator**: Show when upstream data is connected
3. **Options section**: Use collapsible options toggle for advanced settings
4. **ContentModal**: Use `<ContentModal>` for expandable output viewing (already handles JSON/HTML formatting)
5. **Error display**: Show errors in a red box with consistent styling
6. **Handle styling**: Use consistent colors per node type (blue for data, orange for source, green for output, etc.)

### Speaker Diarization (Transcription)

AssemblyAI transcription now includes speaker diarization by default:
- `speaker_labels: true` in the API request
- Response includes `utterances` array with speaker labels and timestamps
- Formatted as `[MM:SS] Speaker A:\ntext`

### API Endpoint Checklist

When adding a new `/api/operations/*` endpoint:
1. Add CORS headers to response
2. Validate required fields and return proper error codes
3. Use the robust JSON parsing pattern above for LLM responses
4. Log errors with `console.error` before returning error responses
5. Add the endpoint to this doc and to api.ts

## Next Up
See FWP-PROMPT-REFERENCE.md for the full ad generation pipeline prompts to integrate as new operations.
