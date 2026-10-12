import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["index.html", "https://njknowledgetest.netlify.app/"],
  ["study-guide/index.html", "https://njknowledgetest.netlify.app/study-guide/"],
  ["test-details/index.html", "https://njknowledgetest.netlify.app/test-details/"],
  ["about/index.html", "https://njknowledgetest.netlify.app/about/"],
  ["privacy/index.html", "https://njknowledgetest.netlify.app/privacy/"],
];

const errors = [];

for (const [relativePath, canonical] of pages) {
  const html = fs.readFileSync(path.join(root, relativePath), "utf8");
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]+)"/s)?.[1]?.trim();
  const actualCanonical = html.match(/<link rel="canonical" href="([^"]+)"/s)?.[1];
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;

  if (!title || title.length < 30 || title.length > 65) {
    errors.push(`${relativePath}: title should be 30-65 characters`);
  }
  if (!description || description.length < 100 || description.length > 165) {
    errors.push(`${relativePath}: description should be 100-165 characters`);
  }
  if (actualCanonical !== canonical) {
    errors.push(`${relativePath}: expected canonical ${canonical}`);
  }
  if (h1Count !== 1) errors.push(`${relativePath}: expected one static h1, found ${h1Count}`);

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON-LD (${error.message})`);
    }
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const [, canonical] of pages) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
    errors.push(`sitemap.xml: missing ${canonical}`);
  }
}

const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://njknowledgetest.netlify.app/sitemap.xml")) {
  errors.push("robots.txt: sitemap declaration is missing");
}

const llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
if (!llms.includes("334 original New Jersey-specific") || !llms.includes("40 correct")) {
  errors.push("llms.txt: core product or test facts are missing");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ pages: pages.length, sitemapUrls: pages.length, structuredData: "valid" }, null, 2));
