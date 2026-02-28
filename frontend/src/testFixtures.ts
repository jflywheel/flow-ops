// Test fixture data for SelfTest component
// Used across Quick, Standard, and Full test tiers

// ~200 words of AI/investing content (matches app domain)
export const SAMPLE_TEXT = `Artificial intelligence is reshaping the investment landscape in ways that few predicted even five years ago. Machine learning algorithms now analyze millions of data points in milliseconds, identifying patterns that human analysts might take weeks to spot. Hedge funds deploying AI-driven strategies have seen returns outpace traditional quantitative approaches by significant margins.

The rise of large language models has created entirely new categories of investment opportunity. Companies building AI infrastructure, from chip manufacturers to cloud providers, have become some of the most valuable businesses in the world. Meanwhile, startups applying AI to specific verticals like healthcare diagnostics, legal document review, and supply chain optimization are attracting record venture capital funding.

For individual investors, the implications are profound. Portfolio construction tools powered by AI can now provide institutional-quality analysis at a fraction of the cost. Risk management systems can simulate thousands of market scenarios in real time, helping investors understand their exposure to various economic conditions. The democratization of these tools means that sophisticated investment strategies are no longer limited to Wall Street firms with massive technology budgets.`;

// Short text for quick/cheap tests
export const SAMPLE_SHORT_TEXT = `AI-powered investment tools are transforming how individual investors build portfolios. Machine learning algorithms can now analyze market patterns and simulate thousands of scenarios in real time, providing institutional-quality analysis at a fraction of the cost.`;

// Stable, always-available URL for fetch testing
export const SAMPLE_URL = "https://en.wikipedia.org/wiki/Artificial_intelligence";

// AI Investor Podcast RSS feed
export const SAMPLE_RSS_URL = "https://rss.buzzsprout.com/2400102.rss";

// Short test audio clip hosted on R2 (~10 seconds, TTS-generated)
export const SAMPLE_AUDIO_URL = "https://pub-08195e0b6ffd47d492492dc6e89720e1.r2.dev/selftest-audio.m4a";

// Tiny 1x1 red pixel PNG as data URL (valid image for upload node testing)
export const SAMPLE_IMAGE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// Minimal valid PDF as data URL (~300 bytes)
export const SAMPLE_PDF_BASE64 =
  "data:application/pdf;base64,JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDQgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjIwNgolJUVPRgo=";

// Minimal valid MP4 as data URL (ftyp box only, ~70 bytes)
export const SAMPLE_VIDEO_BASE64 =
  "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0";
