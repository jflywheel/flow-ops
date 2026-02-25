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

## Next Up
See FWP-PROMPT-REFERENCE.md for the full ad generation pipeline prompts to integrate as new operations.
