#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const webPublicDir = path.join(rootDir, "web", "public");
const blogDir = path.join(webPublicDir, "blog");
const webEnvPath = path.join(rootDir, "web", ".env");

function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

async function loadWebEnv() {
  try {
    const body = await fs.readFile(webEnvPath, "utf8");
    return parseEnv(body);
  } catch {
    return {};
  }
}

function normalizeBase(url, fallback) {
  const value = String(url || fallback || "").trim();
  return value.replace(/\/$/, "");
}

function blogIdFromLink(link) {
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function requestJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    return response.json();
  } catch {
    const body = execFileSync("curl", ["-sS", url], { encoding: "utf8" });
    if (!body || !body.trim()) {
      throw new Error(`Request failed for ${url}`);
    }
    return JSON.parse(body);
  }
}

function imageResolverUrl(workerBaseUrl, sourceLink) {
  return `${workerBaseUrl}/v1/blog-image?link=${encodeURIComponent(sourceLink)}&v=2`;
}

function normalizedDate(value) {
  const parsed = Date.parse(String(value || ""));
  if (Number.isNaN(parsed)) {
    return "";
  }
  return new Date(parsed).toISOString();
}

function articleHtml(article, siteBaseUrl, workerBaseUrl) {
  const canonical = `${siteBaseUrl}/blog/${article.id}/`;
  const title = sanitizeText(article.title || "SKIDS Article");
  const description = sanitizeText(
    article.excerpt || "Article from the SKIDS knowledge library for parents."
  );
  const image = imageResolverUrl(workerBaseUrl, article.link);
  const publishedIso = normalizedDate(article.publishedAt);
  const keywordText = (article.keywords || []).slice(0, 12).join(", ");
  const bodyHtml =
    article.bodyHtml && article.bodyHtml.trim().length > 0
      ? article.bodyHtml
      : `<p>${escapeHtml(description)}</p>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: publishedIso || undefined,
    image,
    publisher: {
      "@type": "Organization",
      name: "SKIDS"
    },
    mainEntityOfPage: canonical,
    keywords: keywordText || undefined
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | SKIDS Parent</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; background: #f6f6f4; color: #25374f; font-family: "Segoe UI", -apple-system, sans-serif; }
      main { max-width: 860px; margin: 0 auto; padding: 24px 16px 60px; }
      .top { font-size: 0.9rem; color: #5d6d84; margin-bottom: 14px; }
      .hero { border: 1px solid #e4dbcf; border-radius: 18px; overflow: hidden; background: #fff; }
      .hero img { width: 100%; height: 300px; object-fit: cover; display: block; background: #eef3f8; }
      .copy { padding: 18px; }
      h1 { font-size: clamp(1.5rem, 3.4vw, 2.4rem); line-height: 1.2; margin: 0 0 10px; color: #1e314b; }
      .meta { color: #66778f; font-size: 0.95rem; margin-bottom: 14px; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
      .chips span { border: 1px solid #d9e3ee; border-radius: 999px; padding: 4px 9px; font-size: 0.75rem; color: #3f566f; background: #f4f9ff; }
      article { margin-top: 16px; display: grid; gap: 14px; line-height: 1.72; font-size: 1.04rem; color: #2f425a; }
      article p { margin: 0; }
      .cta { margin-top: 26px; padding: 14px; border-radius: 12px; border: 1px solid #d9e2ec; background: #f8fcff; }
      a { color: #8e5a36; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <div class="top"><a href="/blog/">Back to SKIDS Library</a></div>
      <section class="hero">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="eager" />
        <div class="copy">
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">${escapeHtml(article.publishedAt || "Recent article")} • SKIDS Knowledge Library</div>
          <div class="chips">
            ${(article.keywords || [])
              .slice(0, 10)
              .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
              .join("")}
          </div>
          <article>${bodyHtml}</article>
          <div class="cta">
            Parent support note: SKIDS Parent provides educational guidance and is not a diagnostic tool. For concern signs, consult your pediatrician.
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function blogIndexHtml(posts, siteBaseUrl, workerBaseUrl) {
  const cards = posts
    .map((post) => {
      const href = `/blog/${post.id}/`;
      const image = imageResolverUrl(workerBaseUrl, post.link);
      return `<a class="card" href="${escapeHtml(href)}">
  <img src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" loading="lazy" />
  <div class="copy">
    <h2>${escapeHtml(post.title)}</h2>
    <p>${escapeHtml(post.excerpt || "Article from the SKIDS knowledge library.")}</p>
    <span>${escapeHtml(post.publishedAt || "Recent")}</span>
  </div>
</a>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SKIDS Blog Library</title>
    <meta name="description" content="SKIDS knowledge library for parents: child development, milestones, health, and practical home guidance." />
    <link rel="canonical" href="${escapeHtml(siteBaseUrl)}/blog/" />
    <style>
      body { margin: 0; background: #f6f6f4; color: #24364e; font-family: "Segoe UI", -apple-system, sans-serif; }
      main { max-width: 1080px; margin: 0 auto; padding: 20px 16px 50px; }
      h1 { margin: 0 0 8px; font-size: clamp(1.6rem, 3vw, 2.5rem); }
      p { margin: 0 0 18px; color: #5f7087; }
      .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
      .card { border: 1px solid #e4dbcf; border-radius: 14px; overflow: hidden; background: #fff; color: inherit; text-decoration: none; }
      .card img { width: 100%; height: 150px; object-fit: cover; display: block; background: #eef3f8; }
      .copy { padding: 12px; display: grid; gap: 8px; }
      .copy h2 { margin: 0; font-size: 1.06rem; line-height: 1.35; }
      .copy p { margin: 0; font-size: 0.9rem; line-height: 1.45; color: #596d86; }
      .copy span { font-size: 0.8rem; color: #6f8097; font-weight: 700; }
      .toplink { display: inline-block; margin-bottom: 12px; color: #8e5a36; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <a class="toplink" href="/">Back to SKIDS Parent App</a>
      <h1>SKIDS Knowledge Library</h1>
      <p>Science-led parent education content across development, health, behavior, and milestone awareness.</p>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`;
}

function buildSitemap(siteBaseUrl, posts) {
  const urls = [`${siteBaseUrl}/`, `${siteBaseUrl}/blog/`, ...posts.map((post) => `${siteBaseUrl}/blog/${post.id}/`)];
  const nodes = urls
    .map(
      (url) => `<url><loc>${escapeHtml(url)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}</urlset>`;
}

async function main() {
  const webEnv = await loadWebEnv();
  const workerBaseUrl = normalizeBase(
    process.env.WORKER_BASE_URL || process.env.VITE_WORKER_BASE_URL || webEnv.VITE_WORKER_BASE_URL,
    "https://pairents.satish-9f4.workers.dev"
  );
  const siteBaseUrl = normalizeBase(
    process.env.SITE_BASE_URL || webEnv.VITE_SITE_BASE_URL,
    "https://healthvoice-8461b.web.app"
  );

  console.log(`Syncing blogs via ${workerBaseUrl}`);
  const feed = await requestJson(`${workerBaseUrl}/v1/blogs?limit=300`);
  const items = Array.isArray(feed.items) ? feed.items : [];
  const summaries = items
    .map((post) => ({
      id: blogIdFromLink(post.link),
      title: sanitizeText(post.title || ""),
      link: sanitizeText(post.link || ""),
      excerpt: sanitizeText(post.excerpt || ""),
      publishedAt: sanitizeText(post.publishedAt || ""),
      imageUrl: sanitizeText(post.imageUrl || ""),
      keywords: Array.isArray(post.keywords) ? post.keywords.map((item) => sanitizeText(item)).filter(Boolean) : []
    }))
    .filter((post) => post.id && post.link);

  await fs.rm(blogDir, { recursive: true, force: true });
  await fs.mkdir(blogDir, { recursive: true });

  const hydrated = [];
  for (const summary of summaries) {
    try {
      const article = await requestJson(
        `${workerBaseUrl}/v1/blog-content?link=${encodeURIComponent(summary.link)}`
      );
      hydrated.push({
        ...summary,
        bodyHtml: sanitizeText(article.bodyHtml) ? article.bodyHtml : `<p>${escapeHtml(summary.excerpt)}</p>`,
        paragraphs: Array.isArray(article.paragraphs) ? article.paragraphs : []
      });
      console.log(`Synced ${summary.id}`);
    } catch {
      hydrated.push({
        ...summary,
        bodyHtml: `<p>${escapeHtml(summary.excerpt || "Open this article in SKIDS Parent for full context.")}</p>`,
        paragraphs: []
      });
      console.log(`Synced ${summary.id} (summary only)`);
    }
  }

  for (const post of hydrated) {
    const targetDir = path.join(blogDir, post.id);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(
      path.join(targetDir, "index.html"),
      articleHtml(post, siteBaseUrl, workerBaseUrl),
      "utf8"
    );
  }

  await fs.writeFile(path.join(blogDir, "index.html"), blogIndexHtml(hydrated, siteBaseUrl, workerBaseUrl), "utf8");
  await fs.writeFile(path.join(blogDir, "manifest.json"), JSON.stringify(hydrated, null, 2), "utf8");
  await fs.writeFile(path.join(webPublicDir, "sitemap.xml"), buildSitemap(siteBaseUrl, hydrated), "utf8");
  await fs.writeFile(
    path.join(webPublicDir, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${siteBaseUrl}/sitemap.xml\n`,
    "utf8"
  );

  console.log(`Generated ${hydrated.length} blog pages in ${blogDir}`);
}

await main();
