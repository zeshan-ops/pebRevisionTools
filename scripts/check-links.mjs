#!/usr/bin/env node
/**
 * Fetches every provision and case URL in content/provisions.json and
 * reports any that don't resolve. Phase 1 acceptance criterion (docs/ui.md):
 * "every chip resolves to a live URL; npm run check:links passes with zero
 * 404s."
 *
 * A GET with a browser-ish User-Agent is used rather than HEAD: several of
 * these hosts (WIPO, EUR-Lex, CURIA) don't reliably support HEAD and return
 * a false 404/405 for it. Concurrency is capped and each request has its own
 * timeout so one slow host doesn't stall the whole run.
 */
import { readFileSync } from "node:fs";

const CONCURRENCY = 5;
const TIMEOUT_MS = 15_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 pebRevisionTools/0.1 (personal revision tool)";

const data = JSON.parse(readFileSync("content/provisions.json", "utf-8"));
const targets = [
  ...data.provisions.map((p) => ({ id: p.id, label: p.citation, url: p.url })),
  ...data.cases.map((c) => ({ id: c.id, label: c.label, url: c.url })),
];

// Several targets share a URL (e.g. every Hague article links to the same
// WIPO Lex text, every RDA schedule page). No point fetching it twice.
const byUrl = new Map();
for (const t of targets) {
  if (!byUrl.has(t.url)) byUrl.set(t.url, []);
  byUrl.get(t.url).push(t);
}
const uniqueUrls = [...byUrl.keys()];

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, status: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
  return results;
}

console.log(`Checking ${uniqueUrls.length} unique URLs (${targets.length} citations)…\n`);

const results = await runPool(uniqueUrls, check, CONCURRENCY);

let failed = 0;
for (const r of results) {
  const affected = byUrl.get(r.url);
  if (!r.ok) {
    failed += affected.length;
    console.log(`FAIL  ${r.status ?? "ERR"}  ${r.url}`);
    for (const t of affected) console.log(`        ${t.id}  ${t.label}`);
    if (r.error) console.log(`        ${r.error}`);
  }
}

console.log(
  `\n${uniqueUrls.length - results.filter((r) => !r.ok).length}/${uniqueUrls.length} URLs OK` +
    (failed ? `, ${failed} citation(s) affected by a failing URL` : ""),
);

if (failed > 0) {
  process.exitCode = 1;
}
