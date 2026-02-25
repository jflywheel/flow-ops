# FWP Pipeline Prompt Reference

Complete documentation of every AI prompt used in the FWP ad generation pipeline.

---

## Table of Contents

1. [fwp-report-generator](#1-fwp-report-generator) - Transcript to report
2. [fwp-copy-generator](#2-fwp-copy-generator) - Ad copy (4 prompt variants)
3. [fwp-landing-generator](#3-fwp-landing-generator) - Landing pages (2 prompt variants)
4. [fwp-meta-advertorial](#4-fwp-meta-advertorial) - Advertorials + Meta copy (2 prompts)
5. [fwp-image-generator](#5-fwp-image-generator) - Visual concepts + images (3 prompt variants)

---

## 1. fwp-report-generator

**Purpose:** Transform podcast transcript into structured investment report

**Model:** `claude-sonnet-4-20250514`

**Max Tokens:** 8000

### Prompt

```
You are a senior financial analyst creating a premium investment research report for 247 Wall St. This report will be offered as a free lead magnet, so it must feel valuable enough that someone would give their email address to receive it.

Today's date: ${today}
Episode: "${episodeTitle}"

TRANSCRIPT:
${transcript.slice(0, 50000)}

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
}
```

---

## 2. fwp-copy-generator

**Purpose:** Generate ad headlines and descriptions for Google and Meta

**Model:** `claude-sonnet-4-20250514`

**Max Tokens:** 4000

### 2a. Report Mode + Google Platform

Character limits: Headlines 30 chars, Descriptions 90 chars

```
You are a direct response copywriter creating Google Demand Gen ad copy for 24/7 Wall St, a financial news and investing site. Your goal is to drive clicks to a free investment report.

TODAY'S DATE: ${today}

REPORT TITLE: "${brief.title}"
EXECUTIVE SUMMARY: ${brief.executiveSummary}

ALL STOCKS MENTIONED: ${allStocks.join(', ') || 'Various stocks'}
KEY NUMBERS: ${allNumbers.join(', ') || 'Multiple data points'}

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

Respond in JSON format with fear, greed, curiosity, urgency objects containing headlines and descriptions arrays.
```

### 2b. Report Mode + Meta Platform

Character limits: Headlines 40 chars, Descriptions 125 chars

```
You are a direct response copywriter creating Meta/Facebook ad copy for 24/7 Wall St, a financial news and investing site. Your goal is to drive clicks to a free investment report.

TODAY'S DATE: ${today}

REPORT TITLE: "${brief.title}"
EXECUTIVE SUMMARY: ${brief.executiveSummary}

ALL STOCKS MENTIONED: ${allStocks.join(', ') || 'Various stocks'}
KEY NUMBERS: ${allNumbers.join(', ') || 'Multiple data points'}

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

Respond in JSON format.
```

### 2c. Newsletter Mode + Google Platform

Same structure as 2a but promotes "The Daily Profit" newsletter instead of a specific report. Newsletter name "Daily Profit" is allowed, but "profit" cannot be used elsewhere.

### 2d. Newsletter Mode + Meta Platform

Same structure as 2b but promotes "The Daily Profit" newsletter with aggressive profit/gains language encouraged.

---

## 3. fwp-landing-generator

**Purpose:** Generate email capture landing page content

**Model:** `claude-3-haiku-20240307`

**Max Tokens:** 4000

### 3a. Report Mode Landing Pages

```
You are creating 4 direct response landing pages for 24/7 Wall St, each targeting a different psychological angle.

TODAY'S DATE: ${today}

REPORT TITLE: "${brief.title}"
EXECUTIVE SUMMARY: ${brief.executiveSummary}

REPORT SECTIONS:
${sectionsContext}

KEY NUMBERS FROM REPORT: ${allKeyNumbers.join(', ') || 'Various data points'}

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
- Each angle should feel distinctly different
```

### 3b. Newsletter Mode Landing Pages (Google Compliant)

```
You are creating 4 direct response landing pages for 24/7 Wall St's free newsletter "The Daily Profit", each targeting a different psychological angle.

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

BONUS REPORT TITLE (mention briefly at end): "${brief.title}"

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
- NEVER use banned words (profit, gains, price targets, etc.)
```

---

## 4. fwp-meta-advertorial

**Purpose:** Generate long-form advertorial articles + Meta ad copy

### 4a. Advertorial Article Generation

**Model:** `claude-sonnet-4-20250514`

**Max Tokens:** 8000

```
You are writing a HIGH-CONVERTING financial advertorial (1200-1800 words) that follows a proven psychological structure. This is NOT a generic article. It must follow the EXACT structure below.

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

Respond in JSON: {"headline": "...", "content": "<p>...</p>..."}
```

### 4b. Meta Ad Copy Generation

**Model:** `claude-sonnet-4-20250514`

**Max Tokens:** 2000

```
You are creating Facebook/Meta ad copy for an advertorial article. Generate compelling ad copy for 4 psychological angles.

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

Respond in JSON with fear, greed, curiosity, urgency objects.
```

---

## 5. fwp-image-generator

**Purpose:** Generate visual concepts and ad images

### 5a. Report Mode Visual Concepts

**Model:** `claude-3-haiku-20240307`

**Max Tokens:** 4000

```
Generate ${count} DIVERSE visual concepts for direct response ad images. These ads promote a free financial report.

REPORT: "${brief.title}"
SUMMARY: ${brief.executiveSummary}
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
}
```

### 5b. Newsletter Mode Visual Concepts

Same structure but focuses on evergreen "Daily Profit" newsletter imagery rather than specific report content.

### 5c. Advertorial Mode Visual Concepts

Generates concepts based on raw article content instead of report structure.

### 5d. Image Generation (Gemini)

**Model:** `gemini-3-pro-image-preview`

```
Create a photorealistic image for a digital advertisement. This must look like a real photograph.

DIMENSIONS: ${spec.width}x${spec.height} pixels (${spec.aspectRatio})

SUBJECT: ${concept.concept}

EMOTIONAL TARGET: ${concept.targetEmotion}

COLOR/LIGHTING: ${concept.colorScheme}

${realismSection}

PHOTOGRAPHY DIRECTION:
- This is a REAL PHOTOGRAPH, not digital art or illustration
- Shot on professional camera (Canon 5D, Sony A7) with 50-85mm lens
- Natural or professional studio lighting appropriate to the scene
- Shallow depth of field where appropriate (f/2.8 for portraits, deeper for scenes)
- The subject should be positioned to leave space for text overlay (rule of thirds)

COMPOSITION RULES:
1. ONE clear focal point - the viewer's eye should go directly to it
2. Clean, uncluttered background (bokeh, solid, or simple environment)
3. Subject in the center 70% of frame (edges may be cropped by platforms)
4. Professional, aspirational, trustworthy feel

ABSOLUTELY FORBIDDEN:
- Any text, words, numbers, labels, or UI elements
- Charts, graphs, arrows, data visualizations
- Multiple competing focal points
- Logos, watermarks, or brand elements
- Anything that looks AI-generated (plastic skin, weird hands, uncanny valley)

FOR PEOPLE: Must look like real humans photographed in real settings. Natural skin texture, real hair with flyaways, genuine expressions, age-appropriate features. NOT stock photo smiles - real candid moments.

FOR TECH: Photorealistic product photography. Real devices, real environments. Can show screens but content should be abstract/blurred, no readable text.

Image dimensions: exactly ${spec.width}x${spec.height} pixels.
```

**Realism Guidelines (included for human subjects):**

```
PHOTOREALISM REQUIREMENTS FOR HUMAN SUBJECTS:
This must look like a real photograph, not AI-generated art.

Photography style:
- Shot on Canon 5D or Sony A7, 50-85mm lens, f/2.8 aperture
- Natural available light or soft window light
- Shallow depth of field with natural background bokeh
- Slight film grain, natural color grading

Human appearance (avoid "AI sheen"):
- Natural skin texture: visible pores, subtle imperfections
- Age-appropriate details: wrinkles, laugh lines for older subjects
- Real hair: individual strands visible, slight flyaways
- Authentic eyes: natural moisture/depth, realistic catchlights
- Natural expressions: candid, genuine, not performative

What to AVOID:
- Poreless, waxy, or plastic-looking skin
- Perfectly uniform lighting
- Hair that looks painted or unnaturally smooth
- Glassy, lifeless eyes
- Overly symmetrical facial features
- Theatrical or stock-photo-style expressions
```

---

## Model Summary

| Service | Prompt Type | Model | Max Tokens |
|---------|-------------|-------|------------|
| Report Generator | Transcript to report | claude-sonnet-4-20250514 | 8000 |
| Copy Generator | Ad headlines/descriptions | claude-sonnet-4-20250514 | 4000 |
| Landing Generator | Landing page content | claude-3-haiku-20240307 | 4000 |
| Advertorial Generator | Long-form article | claude-sonnet-4-20250514 | 8000 |
| Advertorial Generator | Meta ad copy | claude-sonnet-4-20250514 | 2000 |
| Image Generator | Visual concepts | claude-3-haiku-20240307 | 4000 |
| Image Generator | Image generation | gemini-3-pro-image-preview | N/A |

---

## Cost Estimates

Based on typical usage:

| Service | Input Tokens | Output Tokens | Cost per Call |
|---------|--------------|---------------|---------------|
| Report Generator | ~50,000 | ~3,000 | ~$0.20 |
| Copy Generator | ~3,000 | ~1,500 | ~$0.03 |
| Landing Generator | ~2,000 | ~2,000 | ~$0.01 |
| Advertorial Generator | ~8,000 | ~4,000 | ~$0.08 |
| Meta Ad Copy | ~8,000 | ~500 | ~$0.03 |
| Visual Concepts | ~500 | ~2,000 | ~$0.01 |
| Image Generation (Gemini) | ~500 | N/A | ~$0.01/image |

**Full Pipeline Run (typical):**
- 4 copy generations: ~$0.12
- 8 landing pages: ~$0.02
- 4 advertorials: ~$0.32
- 16 images: ~$0.16 (concepts) + ~$0.16 (Gemini) = ~$0.32
- **Total: ~$0.78 per full run**

---

*Last updated: February 25, 2026*
