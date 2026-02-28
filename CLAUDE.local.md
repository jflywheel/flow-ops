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
- **Podcast RSS** - Parses RSS feed, select episode, outputs audio URL
  - Preset: AI Investor Podcast (default), or custom URL
- **Transcribe** - AssemblyAI transcription with speaker diarization and optional speaker identification

### Operation Nodes
- **iPhone Photo** - Generates photorealistic image from text using Gemini image models
  - Models: Gemini 2.5 Flash Image, Gemini 3 Pro Image, Gemini 3.1 Flash Image
  - Options: extra instructions, reference image URL, format (square/landscape/portrait)
- **YT Thumbnails** - Generates 5 YouTube thumbnail images from transcript + reference photo
  - Analyzes transcript for specific tech/topics mentioned
  - Passes reference image directly to Gemini for photorealistic person rendering
  - Models: Gemini 3.1 Flash (default), Gemini 3 Pro, Gemini 2.5 Flash
  - Default reference image: AI Investor Podcast host photo
  - Outputs: 5 thumbnail images (16:9) with overlay text suggestions and download buttons
- **Meta Headlines** - Generates Meta ad copy (5 primary texts ≤125 chars, 5 headlines ≤255 chars)
  - Custom modal with individual copy buttons for each item
- **Animate** - Converts image to video using Veo
  - Models: Veo 2.0, Veo 3.1 Fast, Veo 3.1 Standard
  - Options: prompt, aspect ratio, duration
- **Crop** - Client-side crop for aspect ratios (4:5, 1:1, 16:9, 9:16)
- **Text Overlay** - Adds text on images (not fully implemented)
- **Enhance Text** - Rewrites text (backend exists)
- **Summarize** - Summarizes text to specified length
- **Extract Key Points** - Extracts bullet points from text

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
POST /api/login                           - dog/dog auth, returns JWT
GET  /api/me                              - check auth
POST /api/operations/iphone-photo         - Gemini image generation
POST /api/operations/animate              - Veo video generation (async polling)
POST /api/operations/enhance-text         - Text rewriting
POST /api/operations/text-overlay         - Image text overlay
POST /api/operations/fetch-url            - URL fetch + article extraction
POST /api/operations/transcribe           - AssemblyAI transcription
POST /api/operations/podcast-rss          - Parse podcast RSS feed
POST /api/operations/summarize            - Summarize text
POST /api/operations/extract-key-points   - Extract bullet points
POST /api/operations/generate-meta-headlines    - Meta ad copy (primary texts + headlines)
POST /api/operations/generate-youtube-thumbnails - Generate 5 thumbnail images from transcript + reference
```

## Deployment
- Worker: `wrangler deploy` from root
- Frontend: `cd frontend && npm run build && wrangler pages deploy dist`

## State Persistence
- Flow state (nodes, edges, node data) persists to localStorage
- Auto-saves on changes (debounced 500ms)
- Loads on page refresh
- Clear button to reset canvas

## YouTube Thumbnails Workflow
```
Podcast RSS → Transcribe → YT Thumbnails → 5 downloadable images
```
- Default podcast: AI Investor Podcast RSS feed
- Default reference image: Host photo from Squarespace
- Generates 5 thumbnails based on specific tech/topics from transcript
- Reference image passed directly to Gemini (not described first)
- Person rendered photorealistically, not cartoonish

## Node Isolation Rule

**When fixing or changing a node, only modify that node's file.** Do not change other nodes, FlowEditor's data propagation, or api.ts unless explicitly asked.

Each node has a clear contract:
- **Inputs**: What it expects via `data.inputValue` (or other data props)
- **Outputs**: What it sets on its own data (e.g. `summary`, `transcript`, `imageUrl`, `report`)
- **API call**: Which `api.ts` function it calls and what shape it expects back

If a node is broken, fix it within its own file. If you think the problem is in another node or in the propagation logic, say so and ask before touching it. Changing other nodes to fix one problem creates cascading issues. The self-test runner verifies each API independently and chains them together, so regressions get caught.

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

## LLM API Integration
- Always verify model IDs against the provider's current API docs before using them. Do NOT assume model IDs like 'sonnet' or old Gemini model strings are valid.
- When calling image/content generation APIs, pass binary data or URLs directly. Never describe an image to the model as a substitute for passing it.
- When parsing LLM responses, always strip markdown code block wrappers (```json ... ```) before JSON.parse(). This is the most common failure mode in our pipeline nodes.

## Data & Query Accuracy
- When querying data (D1, R2, KV), always verify the query logic matches the SPECIFIC entity requested, not just any entity from the same provider/category.
- When reporting numbers from data queries, double-check recency and accuracy before presenting. User relies on these numbers for business decisions.

## Commit Often
Commit after completing each meaningful unit of work (new feature, bug fix, refactor). Don't wait until the end of a session. If something is done and working, commit it.

## Session Continuity
- This project uses a PLAN.md file for multi-session work. Always read PLAN.md at the start of a session when the user says 'continue'.
- After completing a planned session, update PLAN.md with progress and mark completed items.

## Next Up
See FWP-PROMPT-REFERENCE.md for the full ad generation pipeline prompts to integrate as new operations.
