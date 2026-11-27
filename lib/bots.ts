/**
 * Crawlers that only scrape (AI training, SEO tools) and can burn the hosting allowance in hours:
 * on 27 Nov 2026 OpenAI's GPTBot made ~115 requests a minute to the shop's filter pages.
 * Search engines (Google, Bing) are not on this list.
 */
export const BLOCKED_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "PerplexityBot",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "PetalBot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
] as const;

const pattern = new RegExp(BLOCKED_BOTS.map((b) => b.replace(/[-.]/g, "\$&")).join("|"), "i");

export const isBlockedBot = (userAgent: string | null) => !!userAgent && pattern.test(userAgent);
