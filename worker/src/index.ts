interface Env {
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  FIREBASE_WEB_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
}

interface FivePartResponse {
  whatIsHappeningDevelopmentally: string;
  whatParentsMayNotice: string;
  whatIsNormalVariation: string;
  whatToDoAtHome: string;
  whenToSeekClinicalScreening: string;
}

interface BlogPost {
  title: string;
  link: string;
  publishedAt: string;
  excerpt: string;
  imageUrl: string;
  keywords: string[];
}

interface BlogArticle {
  id: string;
  link: string;
  title: string;
  publishedAt: string;
  excerpt: string;
  imageUrl: string;
  keywords: string[];
  paragraphs: string[];
  bodyHtml: string;
}

const jsonHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS"
};

const blockedInjectionPhrases = [
  "ignore previous instructions",
  "ignore all prior instructions",
  "system prompt",
  "reveal hidden prompt",
  "bypass safety"
];
const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "have",
  "will",
  "into",
  "about",
  "when",
  "what",
  "their",
  "there",
  "where",
  "which",
  "than",
  "then",
  "also",
  "just",
  "been",
  "were",
  "they",
  "them",
  "more",
  "some",
  "only",
  "over",
  "under",
  "care",
  "child",
  "children"
]);
const BLOG_FEED_URL = "https://skids.clinic/feed";
const BLOG_SITE_ORIGIN = "https://skids.clinic";
const BLOG_MAX_PAGES = 24;
const BLOG_CACHE_TTL_MS = 15 * 60 * 1000;
const BLOG_IMAGE_CACHE_TTL_MS = 20 * 60 * 1000;

let blogCache: { fetchedAt: number; items: BlogPost[] } | null = null;
let blogImageCache: Map<string, { fetchedAt: number; imageUrl: string }> = new Map();
let blogArticleCache: Map<string, { fetchedAt: number; article: BlogArticle }> = new Map();

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num: string) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, "...")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(item: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = item.match(pattern);
  if (!match?.[1]) {
    return "";
  }
  return stripCdata(match[1]);
}

function extractAllTags(item: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches = item.match(pattern) ?? [];
  return matches
    .map((entry) => {
      const single = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return single?.[1] ? stripCdata(single[1]) : "";
    })
    .filter(Boolean);
}

function extractImage(value: string): string {
  const imgTag = value.match(/<img[^>]+src="([^"]+)"/i);
  if (imgTag?.[1]) {
    return imgTag[1];
  }

  const mediaTag = value.match(/<media:content[^>]+url="([^"]+)"/i);
  if (mediaTag?.[1]) {
    return mediaTag[1];
  }

  const enclosureTag = value.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enclosureTag?.[1]) {
    return enclosureTag[1];
  }

  return "";
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function absoluteUrl(value: string, base = BLOG_SITE_ORIGIN): string {
  const normalized = decodeEntities(value).trim();
  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized, base).toString();
  } catch {
    return "";
  }
}

function normalizeBlogLink(value: string): string {
  const absolute = absoluteUrl(value, BLOG_SITE_ORIGIN);
  if (!absolute) {
    return "";
  }

  try {
    const parsed = new URL(absolute);
    if (normalizeHost(parsed.hostname) !== "skids.clinic") {
      return "";
    }
    if (!parsed.pathname.startsWith("/blog/")) {
      return "";
    }
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeImageUrl(value: string): string {
  const absolute = absoluteUrl(value, BLOG_SITE_ORIGIN);
  if (!absolute) {
    return "";
  }

  try {
    const parsed = new URL(absolute);
    if (parsed.protocol !== "https:") {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function isLikelyLogoImage(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("/images/logo") ||
    normalized.includes("logo.png") ||
    normalized.includes("logo.svg") ||
    normalized.includes("url=%2fimages%2flogo")
  );
}

function extractBlogImageFromPage(document: string): string {
  const ogImage = document.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  if (ogImage?.[1]) {
    const normalized = normalizeImageUrl(ogImage[1]);
    if (normalized) {
      return normalized;
    }
  }

  const twitterImage = document.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  if (twitterImage?.[1]) {
    const normalized = normalizeImageUrl(twitterImage[1]);
    if (normalized) {
      return normalized;
    }
  }

  const imageTag = document.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imageTag?.[1]) {
    return normalizeImageUrl(imageTag[1]);
  }

  return "";
}

function blogIdFromLink(link: string): string {
  try {
    const parsed = new URL(link);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "blog") {
      return parts[1];
    }
    return "";
  } catch {
    return "";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value: string): string {
  return decodeEntities(stripHtml(value)).replace(/\s+/g, " ").trim();
}

function dedupeParagraphs(values: string[]): string[] {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];
  const navCues = [
    "home",
    "skids clinic",
    "skids advanced",
    "skids in school",
    "subscription",
    "about",
    "feed",
    "contact",
    "login",
    "loading blog"
  ];
  for (const entry of values) {
    const normalized = cleanText(entry);
    if (!normalized || normalized.length < 50) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    if (
      key.includes("cookie") ||
      key.includes("privacy policy") ||
      key.includes("subscribe") ||
      key.includes("all rights reserved") ||
      key.includes("karnataka") ||
      key.includes("bengaluru") ||
      key.includes("aecs layout")
    ) {
      continue;
    }

    const navHits = navCues.reduce((count, cue) => (key.includes(cue) ? count + 1 : count), 0);
    if (navHits >= 4) {
      continue;
    }

    seen.add(key);
    uniqueValues.push(normalized);
  }
  return uniqueValues;
}

function parseJsonSafe<T = unknown>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function pushCandidateParagraph(target: string[], value: unknown): void {
  if (typeof value !== "string") {
    return;
  }

  const text = cleanText(value);
  if (text.length < 80) {
    return;
  }
  target.push(text);
}

function collectParagraphsFromObject(input: unknown, target: string[], depth = 0): void {
  if (!input || depth > 9) {
    return;
  }

  if (typeof input === "string") {
    pushCandidateParagraph(target, input);
    return;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      collectParagraphsFromObject(value, target, depth + 1);
    }
    return;
  }

  if (typeof input !== "object") {
    return;
  }

  const record = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("articlebody") ||
      lowerKey === "content" ||
      lowerKey.includes("body") ||
      lowerKey.includes("description") ||
      lowerKey.includes("summary") ||
      lowerKey.includes("text")
    ) {
      pushCandidateParagraph(target, typeof value === "string" ? value : "");
    }
    collectParagraphsFromObject(value, target, depth + 1);
  }
}

function extractParagraphsFromJsonLd(document: string): string[] {
  const matches = document.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const paragraphs: string[] = [];

  for (const entry of matches) {
    const scriptMatch = entry.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!scriptMatch?.[1]) {
      continue;
    }

    const parsed = parseJsonSafe<unknown>(scriptMatch[1].trim());
    if (!parsed) {
      continue;
    }

    collectParagraphsFromObject(parsed, paragraphs);
  }

  return dedupeParagraphs(paragraphs);
}

function extractParagraphsFromNextData(document: string): string[] {
  const nextDataMatch = document.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!nextDataMatch?.[1]) {
    return [];
  }

  const parsed = parseJsonSafe<unknown>(nextDataMatch[1].trim());
  if (!parsed) {
    return [];
  }

  const paragraphs: string[] = [];
  collectParagraphsFromObject(parsed, paragraphs);
  return dedupeParagraphs(paragraphs);
}

function extractMetaContent(document: string, attribute: "property" | "name", key: string): string {
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${key}["'][^>]+content=["']([\\s\\S]*?)["'][^>]*>`,
    "i"
  );
  const match = document.match(pattern);
  return match?.[1] ? decodeEntities(match[1]).trim() : "";
}

function extractTitleFromDocument(document: string): string {
  const ogTitle = extractMetaContent(document, "property", "og:title");
  if (ogTitle) {
    return cleanText(ogTitle);
  }
  const h1Match = document.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) {
    return cleanText(h1Match[1]);
  }
  const titleMatch = document.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1] ? cleanText(titleMatch[1]) : "";
}

function extractPublishedFromDocument(document: string): string {
  return (
    extractMetaContent(document, "property", "article:published_time") ||
    extractMetaContent(document, "name", "article:published_time") ||
    ""
  );
}

function extractParagraphs(document: string): string[] {
  const fromJsonLd = extractParagraphsFromJsonLd(document);
  if (fromJsonLd.length > 0) {
    return fromJsonLd.slice(0, 18);
  }

  const fromNextData = extractParagraphsFromNextData(document);
  if (fromNextData.length > 0) {
    return fromNextData.slice(0, 18);
  }

  const articleMatch = document.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const scoped = articleMatch?.[1] ?? document;
  const paragraphMatches = scoped.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  const extracted = paragraphMatches
    .map((paragraph) => paragraph.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, ""))
    .map((paragraph) => cleanText(paragraph));

  const filtered = dedupeParagraphs(extracted);
  if (filtered.length > 0) {
    return filtered.slice(0, 18);
  }

  // Fallback for script-heavy pages: extract long text lines from the body.
  const bodyMatch = document.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = cleanText(bodyMatch?.[1] ?? document);
  const chunks = bodyText.split(/(?<=[.?!])\s+/).filter((line) => line.length >= 80);
  return dedupeParagraphs(chunks).slice(0, 12);
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeCategories(categories: string[]): string[] {
  return categories.map((value) => normalizeText(value)).filter((value) => value.length >= 3);
}

function extractAgeSignals(value: string): string[] {
  const source = normalizeText(value);
  const stages = ["newborn", "infant", "baby", "toddler", "preschool", "teen", "adolescent"];
  const stageHits = stages.filter((stage) => source.includes(stage));

  const ageTokens: string[] = [];
  const numericMatches = source.match(/\b\d{1,2}\s*(month|months|year|years)\b/g) ?? [];
  for (const item of numericMatches) {
    ageTokens.push(item.trim());
  }

  return unique([...stageHits, ...ageTokens]);
}

function buildKeywords(categories: string[], title: string, excerpt: string, body: string): string[] {
  const words = unique([
    ...normalizeCategories(categories),
    ...categories.flatMap((category) => tokenize(category)),
    ...tokenize(title),
    ...tokenize(excerpt),
    ...tokenize(body.slice(0, 2500)),
    ...extractAgeSignals(`${title} ${excerpt} ${body}`)
  ]);
  return words.slice(0, 36);
}

function searchScore(post: BlogPost, queryTokens: string[]): number {
  const title = normalizeText(post.title);
  const excerpt = normalizeText(post.excerpt);
  const keywords = normalizeText(post.keywords.join(" "));
  const link = normalizeText(post.link);

  let score = 0;
  for (const token of queryTokens) {
    if (!token) {
      continue;
    }
    if (title.includes(token)) {
      score += 6;
    }
    if (keywords.includes(token)) {
      score += 5;
    }
    if (excerpt.includes(token)) {
      score += 3;
    }
    if (link.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function parseItem(item: string): BlogPost {
  const title = decodeEntities(extractTag(item, "title")) || "SKIDS Article";
  const link = normalizeBlogLink(extractTag(item, "link"));
  const publishedAt = extractTag(item, "pubDate");
  const description = decodeEntities(extractTag(item, "description"));
  const content = decodeEntities(extractTag(item, "content:encoded"));

  const excerptSource = content || description;
  const excerptText = stripHtml(excerptSource).slice(0, 260);
  const excerpt = excerptText || "Open to read this article from the SKIDS knowledge library.";

  const categories = extractAllTags(item, "category").map((category) =>
    decodeEntities(stripHtml(category))
  );

  const imageUrl = normalizeImageUrl(extractImage(item + content + description));
  const keywords = buildKeywords(categories, title, excerpt, stripHtml(content || description));

  return {
    title,
    link,
    publishedAt,
    excerpt,
    imageUrl,
    keywords
  };
}

function parseHtmlFeed(document: string): BlogPost[] {
  const cards = document.match(/<article class="bg-white[\s\S]*?<\/article>/gi) ?? [];
  return cards
    .map((card) => {
      const linkMatch = card.match(/href="(\/blog\/[^"]+)"/i);
      const titleMatch = card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const imageMatch = card.match(/<img[^>]+src="([^"]+)"/i);
      const dateMatch = card.match(/<div class="flex items-center[\s\S]*?<span>([^<]+)<\/span>/i);
      const categoryMatch = card.match(/<span class="text-xs[^>]*>([\s\S]*?)<\/span>/i);

      if (!linkMatch?.[1] || !titleMatch?.[1]) {
        return null;
      }

      const link = normalizeBlogLink(linkMatch[1]);
      if (!link) {
        return null;
      }

      const title = decodeEntities(stripHtml(titleMatch[1]));
      const category = categoryMatch?.[1] ? decodeEntities(stripHtml(categoryMatch[1])) : "";
      const dateText = dateMatch?.[1] ? decodeEntities(stripHtml(dateMatch[1])) : "";
      const excerpt = category
        ? `${category} article from the SKIDS knowledge library.`
        : "Article from the SKIDS knowledge library.";
      const content = `${title} ${category} ${dateText}`.trim();

      return {
        title: title || "SKIDS Article",
        link,
        publishedAt: dateText,
        excerpt,
        imageUrl: imageMatch?.[1] ? normalizeImageUrl(imageMatch[1]) : "",
        keywords: buildKeywords(category ? [category] : [], title, excerpt, content)
      } as BlogPost;
    })
    .filter((item): item is BlogPost => Boolean(item));
}

function parseFeed(document: string): BlogPost[] {
  const rssItems = document.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  if (rssItems.length > 0) {
    return rssItems.map((item) => parseItem(item)).filter((item) => item.link);
  }
  return parseHtmlFeed(document);
}

function publishTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function fetchFeedPage(page: number): Promise<BlogPost[]> {
  const feedUrl = page === 1 ? BLOG_FEED_URL : `${BLOG_FEED_URL}?paged=${page}`;
  const feed = await fetch(feedUrl, {
    cf: { cacheEverything: true, cacheTtl: 900 }
  });

  if (!feed.ok) {
    throw new Error(`Feed page ${page} request failed with ${feed.status}`);
  }

  const body = await feed.text();
  return parseFeed(body);
}

async function getBlogLibrary(): Promise<BlogPost[]> {
  const now = Date.now();
  if (blogCache && now - blogCache.fetchedAt < BLOG_CACHE_TTL_MS) {
    return blogCache.items;
  }

  const byLink = new Map<string, BlogPost>();
  let duplicatePages = 0;

  for (let page = 1; page <= BLOG_MAX_PAGES; page += 1) {
    let pageItems: BlogPost[] = [];
    try {
      pageItems = await fetchFeedPage(page);
    } catch (error) {
      if (page === 1) {
        throw error;
      }
      break;
    }

    if (pageItems.length === 0) {
      break;
    }

    let pageAdds = 0;
    for (const entry of pageItems) {
      if (entry.link && !byLink.has(entry.link)) {
        byLink.set(entry.link, entry);
        pageAdds += 1;
      }
    }

    if (pageAdds === 0) {
      duplicatePages += 1;
      if (duplicatePages >= 2) {
        break;
      }
    } else {
      duplicatePages = 0;
    }
  }

  const items = Array.from(byLink.values()).sort(
    (a, b) => publishTime(b.publishedAt) - publishTime(a.publishedAt)
  );
  blogCache = { fetchedAt: now, items };
  return items;
}

function searchBlogs(items: BlogPost[], query: string): BlogPost[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return items;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const ranked = items
    .map((post) => ({
      post,
      score: searchScore(post, tokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return publishTime(b.post.publishedAt) - publishTime(a.post.publishedAt);
    });

  return ranked.map((entry) => entry.post);
}

async function fetchClinicBlogs(search = "", limit = 120): Promise<{ items: BlogPost[]; total: number }> {
  const library = await getBlogLibrary();
  const filtered = searchBlogs(library, search);
  const boundedLimit = Math.max(1, Math.min(300, Number.isFinite(limit) ? limit : 120));
  return {
    items: filtered.slice(0, boundedLimit),
    total: library.length
  };
}

async function resolveBlogImage(link: string): Promise<string> {
  const normalizedLink = normalizeBlogLink(link);
  if (!normalizedLink) {
    return "";
  }

  const now = Date.now();
  const cached = blogImageCache.get(normalizedLink);
  if (cached && now - cached.fetchedAt < BLOG_IMAGE_CACHE_TTL_MS) {
    return cached.imageUrl;
  }

  const pickLibraryImage = async (): Promise<string> => {
    const library = await getBlogLibrary();
    const candidate = library.find((entry) => entry.link === normalizedLink)?.imageUrl ?? "";
    if (!candidate || isLikelyLogoImage(candidate)) {
      return "";
    }
    return candidate;
  };

  let imageUrl = await pickLibraryImage();

  if (!imageUrl) {
    // Force refresh feed cache once to rotate signed URLs and recover missing thumbnails.
    blogCache = null;
    imageUrl = await pickLibraryImage();
  }

  if (!imageUrl) {
    try {
      const page = await fetch(normalizedLink, {
        cf: { cacheEverything: true, cacheTtl: 900 }
      });
      if (page.ok) {
        const html = await page.text();
        const candidate = extractBlogImageFromPage(html);
        if (candidate && !isLikelyLogoImage(candidate)) {
          imageUrl = candidate;
        }
      }
    } catch {
      imageUrl = "";
    }
  }

  if (!imageUrl) {
    return "";
  }

  blogImageCache.set(normalizedLink, { fetchedAt: now, imageUrl });
  return imageUrl;
}

async function resolveBlogArticle(link: string): Promise<BlogArticle | null> {
  const normalizedLink = normalizeBlogLink(link);
  if (!normalizedLink) {
    return null;
  }

  const now = Date.now();
  const cached = blogArticleCache.get(normalizedLink);
  if (cached && now - cached.fetchedAt < BLOG_IMAGE_CACHE_TTL_MS) {
    return cached.article;
  }

  const library = await getBlogLibrary();
  const summary = library.find((entry) => entry.link === normalizedLink);
  const id = blogIdFromLink(normalizedLink);
  if (!id) {
    return null;
  }

  let title = summary?.title ?? "SKIDS Article";
  let excerpt = summary?.excerpt ?? "Article from the SKIDS knowledge library.";
  let publishedAt = summary?.publishedAt ?? "";
  let imageUrl = summary?.imageUrl ?? "";
  let keywords = summary?.keywords ?? [];
  let paragraphs: string[] = [];

  try {
    const page = await fetch(normalizedLink, {
      cf: { cacheEverything: true, cacheTtl: 900 }
    });
    if (page.ok) {
      const html = await page.text();
      const pageTitle = extractTitleFromDocument(html);
      if (pageTitle && !/^skids clinic$/i.test(pageTitle.trim())) {
        title = pageTitle;
      }
      excerpt =
        extractMetaContent(html, "property", "og:description") ||
        extractMetaContent(html, "name", "description") ||
        excerpt;
      publishedAt = extractPublishedFromDocument(html) || publishedAt;
      const pageImage = extractBlogImageFromPage(html);
      if (pageImage && !isLikelyLogoImage(pageImage)) {
        imageUrl = pageImage;
      }
      paragraphs = extractParagraphs(html);
    }
  } catch {
    // fallback to library summary only
  }

  if (keywords.length === 0) {
    keywords = buildKeywords([], title, excerpt, paragraphs.join(" "));
  }

  if (!imageUrl || isLikelyLogoImage(imageUrl)) {
    imageUrl = await resolveBlogImage(normalizedLink);
  }

  const bodyHtml =
    paragraphs.length > 0
      ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n")
      : `<p>${escapeHtml(excerpt)}</p>`;

  const article: BlogArticle = {
    id,
    link: normalizedLink,
    title,
    publishedAt,
    excerpt,
    imageUrl,
    keywords,
    paragraphs,
    bodyHtml
  };

  blogArticleCache.set(normalizedLink, { fetchedAt: now, article });
  return article;
}

function enforceInputPolicy(input: string): void {
  const lowered = input.toLowerCase();
  if (input.trim().length > 1800) {
    throw new Error("Input is too long. Please shorten your message.");
  }
  for (const phrase of blockedInjectionPhrases) {
    if (lowered.includes(phrase)) {
      throw new Error("Request contains unsafe instruction override content.");
    }
  }
}

function ensureFivePart(input: Partial<FivePartResponse>): FivePartResponse {
  const fallback = "Continue observing and tracking changes over time.";
  return {
    whatIsHappeningDevelopmentally: input.whatIsHappeningDevelopmentally || fallback,
    whatParentsMayNotice: input.whatParentsMayNotice || fallback,
    whatIsNormalVariation: input.whatIsNormalVariation || fallback,
    whatToDoAtHome: input.whatToDoAtHome || fallback,
    whenToSeekClinicalScreening: input.whenToSeekClinicalScreening || fallback
  };
}

function appendIfMissing(base: string, sentence: string, cues: string[]): string {
  const lowered = base.toLowerCase();
  if (cues.some((cue) => lowered.includes(cue))) {
    return base;
  }
  return `${base.trim()} ${sentence}`.trim();
}

function applySupportProgramFraming(input: Partial<FivePartResponse>): FivePartResponse {
  const normalized = ensureFivePart(input);
  return {
    ...normalized,
    whatToDoAtHome: appendIfMissing(
      normalized.whatToDoAtHome,
      "Track observations and share them during regular pediatric checkups.",
      ["checkup", "well-child", "pediatric"]
    ),
    whenToSeekClinicalScreening: appendIfMissing(
      appendIfMissing(
        normalized.whenToSeekClinicalScreening,
        "Seek pediatric review sooner for regression, loss of skills, persistent asymmetry, or ongoing concern.",
        ["regression", "loss of skills", "asymmetry", "ongoing concern", "pediatric review"]
      ),
      "If there is breathing difficulty, persistent vomiting, seizure, severe dehydration, or unusual drowsiness, seek urgent in-person care immediately.",
      ["urgent", "emergency", "breathing difficulty", "seizure", "dehydration", "immediately"]
    )
  };
}

function extractJson(text: string): unknown {
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(stripped);
}

function clipText(value: string, size = 1400): string {
  const normalized = value.trim();
  if (normalized.length <= size) {
    return normalized;
  }
  return `${normalized.slice(0, size - 1)}...`;
}

function parseModelResponse(rawText: string): FivePartResponse {
  try {
    return applySupportProgramFraming(extractJson(rawText) as Partial<FivePartResponse>);
  } catch {
    const plain = cleanText(rawText);
    return applySupportProgramFraming({
      whatIsHappeningDevelopmentally: plain || "Continue observing and tracking changes over time.",
      whatParentsMayNotice: "Patterns can vary by child and by day. Watch consistency over 1-2 weeks.",
      whatIsNormalVariation: "Some variation in pace is common, especially during growth transitions.",
      whatToDoAtHome: "Use short daily routines, log observations, and discuss trends during routine checkups.",
      whenToSeekClinicalScreening:
        "Seek pediatric review sooner for regression, loss of skills, persistent asymmetry, or sustained parent concern."
    });
  }
}

function buildSystemPrompt(
  mode: "ask" | "checkin",
  input: string,
  context: string,
  options?: {
    conversationContext?: string;
    parentContext?: string;
    childAgeMonths?: number;
    focusDomain?: string;
  }
): string {
  const focusDomain = options?.focusDomain?.trim() || "general";
  const ageContext =
    Number.isFinite(Number(options?.childAgeMonths)) && Number(options?.childAgeMonths) >= 0
      ? `${Number(options?.childAgeMonths)} months`
      : "unknown";
  return [
    "You are SKIDS Pediatric Companion for a parent support and involvement program.",
    "Core philosophy: encourage wonder about child growth, science-backed learning, and regular pediatric checkups.",
    "Tone: empathetic, calm, practical, non-judgmental, medically accurate, plain language.",
    "Start with one short validating sentence that acknowledges the parent's concern.",
    "Do not diagnose disease, prescribe treatment, or interpret lab results.",
    "Do not provide emergency treatment plans. For immediate danger, direct the parent to urgent in-person care immediately.",
    "You are not a replacement for pediatric evaluation; clearly state when clinical review is appropriate.",
    "Use milestone context to explain where the child may be now, what to observe next, and what parents can do at home.",
    "If parent asks about diagnosis or medication, acknowledge concern and redirect to pediatric review safely.",
    "Gently reinforce that parent observations become part of a longitudinal child health record.",
    "Return ONLY JSON with exactly these keys:",
    "whatIsHappeningDevelopmentally, whatParentsMayNotice, whatIsNormalVariation, whatToDoAtHome, whenToSeekClinicalScreening",
    "In section 5, include clear thresholds for when to involve pediatrician/screening.",
    "Keep each section concise and parent-friendly (2-4 sentences).",
    `Mode: ${mode}`,
    `Child profile context: age=${ageContext}, domain=${focusDomain}`,
    `Program context: ${clipText(options?.parentContext || "none provided", 220)}`,
    `Parent input: ${clipText(input, 700)}`,
    `Milestone context: ${clipText(context || "none provided", 550)}`,
    `Conversation context: ${clipText(options?.conversationContext || "none provided", 750)}`
  ].join("\n");
}

async function verifyFirebaseToken(token: string, env: Env): Promise<string | null> {
  if (!env.FIREBASE_WEB_API_KEY) {
    return null;
  }

  const verify = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token })
    }
  );

  if (!verify.ok) {
    return null;
  }

  const data = (await verify.json()) as { users?: Array<{ localId?: string }> };
  return data.users?.[0]?.localId ?? null;
}

async function callGemini(prompt: string, env: Env): Promise<FivePartResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return parseModelResponse(text);
}

async function callGroq(prompt: string, env: Env): Promise<FivePartResponse> {
  if (!env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) {
    throw new Error(`Groq failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return parseModelResponse(text);
}

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.slice("Bearer ".length).trim();
}

async function handleAiRequest(request: Request, env: Env, mode: "ask" | "checkin"): Promise<Response> {
  const bearer = getBearerToken(request);
  if (!bearer) {
    return response({ error: "Missing bearer token" }, 401);
  }

  const uid = await verifyFirebaseToken(bearer, env);
  if (!uid) {
    return response({ error: "Invalid Firebase auth token" }, 401);
  }

  const payload = (await request.json()) as {
    question?: string;
    summary?: string;
    milestoneContext?: string;
    conversationContext?: string;
    parentContext?: string;
    childAgeMonths?: number;
    focusDomain?: string;
  };

  const sourceText = mode === "ask" ? payload.question ?? "" : payload.summary ?? "";
  if (!sourceText.trim()) {
    return response({ error: "Missing input text" }, 400);
  }

  try {
    enforceInputPolicy(sourceText);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unsafe input" }, 400);
  }

  const prompt = buildSystemPrompt(mode, sourceText, payload.milestoneContext ?? "", {
    conversationContext: payload.conversationContext ?? "",
    parentContext: payload.parentContext ?? "",
    childAgeMonths: Number(payload.childAgeMonths ?? Number.NaN),
    focusDomain: payload.focusDomain ?? "general"
  });

  try {
    const gemini = await callGemini(prompt, env);
    return response({ uid, provider: "gemini", response: gemini });
  } catch {
    try {
      const groq = await callGroq(prompt, env);
      return response({ uid, provider: "groq", response: groq });
    } catch (error) {
      return response(
        {
          error: "AI providers unavailable",
          details: error instanceof Error ? error.message : "Unknown provider error"
        },
        502
      );
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: jsonHeaders });
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/health") {
      return response({ ok: true, service: "pairents" });
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
      return response({
        service: "pairents",
        status: "ok",
        endpoints: [
          "/health",
          "/v1/ask",
          "/v1/checkin",
          "/v1/blogs",
          "/v1/blog-image",
          "/v1/blog-content"
        ]
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204, headers: jsonHeaders });
    }

    if (request.method === "POST" && url.pathname === "/v1/ask") {
      return handleAiRequest(request, env, "ask");
    }

    if (request.method === "POST" && url.pathname === "/v1/checkin") {
      return handleAiRequest(request, env, "checkin");
    }

    if (request.method === "GET" && url.pathname === "/v1/blogs") {
      try {
        const query = url.searchParams.get("q") ?? "";
        const limit = Number(url.searchParams.get("limit") ?? "120");
        const blogs = await fetchClinicBlogs(query, limit);
        return response({
          items: blogs.items,
          total: blogs.total,
          matched: blogs.items.length
        });
      } catch (error) {
        return response(
          {
            items: [],
            total: 0,
            matched: 0,
            error: error instanceof Error ? error.message : "Blog fetch failed"
          },
          200
        );
      }
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/v1/blog-image") {
      const link = url.searchParams.get("link") ?? "";
      if (!link) {
        return response({ error: "Missing link query param" }, 400);
      }

      const imageUrl = await resolveBlogImage(link);
      if (!imageUrl) {
        return response({ error: "Image not found" }, 404);
      }

      return new Response(null, {
        status: 302,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=1200",
          location: imageUrl
        }
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/v1/blog-content") {
      const link = url.searchParams.get("link") ?? "";
      if (!link) {
        return response({ error: "Missing link query param" }, 400);
      }

      const article = await resolveBlogArticle(link);
      if (!article) {
        return response({ error: "Article not found" }, 404);
      }

      return response(article);
    }

    return response({ error: "Not found" }, 404);
  }
};
