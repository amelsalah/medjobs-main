/** @typedef {import('../types/sync.types.js').SyncLogger} SyncLogger */

import { createHash } from "node:crypto";
import { load } from "cheerio";
import { HTML_FETCH_TIMEOUT_MS, HTML_USER_AGENT } from "../schemas/sync.schema.js";
import { pruneSourceJobs, upsertJob } from "./sync.queries.js";

/**
 * @param {SyncLogger} [log]
 */
function logLine(log, msg) {
  if (log?.write) log.write(msg);
  else console.log(msg);
}

/**
 * @param {SyncLogger} [log]
 */
function logErr(log, msg) {
  if (log?.write) log.write(msg);
  else console.error(msg);
}

function urlHash(u) {
  return createHash("sha256").update(u).digest("hex").slice(0, 24);
}

const NAV_LIKE = /^(home|contact(\s+us)?|privacy|cookies?|terms|login|sign\s*in|about(\s+us)?|search)$/i;

function hrefLooksJobLike(href) {
  const h = href.toLowerCase();
  return (
    /(job|career|vacanc|opening|position|requisition|posting|apply|opportunit|work-with|join-)/i.test(h) ||
    /\/jobs?\//i.test(h) ||
    /jobid=|reqid=|requisition/i.test(h)
  );
}

/**
 * @param {object} opts
 * @param {string} opts.careersUrl
 * @param {string} opts.hospitalName
 * @param {string | null} [opts.sourceKey]
 * @param {string} [opts.region]
 * @param {number} [opts.maxJobs]
 * @param {SyncLogger} [opts.stdout]
 * @param {SyncLogger} [opts.stderr]
 */
export async function scrapeCareersHtml({
  careersUrl,
  hospitalName,
  sourceKey,
  region,
  maxJobs = 50,
  stdout,
  stderr,
}) {
  const out = (m) => logLine(stdout, m);
  const err = (m) => logErr(stderr, m);

  let pageUrl;
  try {
    pageUrl = new URL(careersUrl.trim());
  } catch {
    err(`Skip HTML scrape (bad URL): ${careersUrl}`);
    return { upserted: 0, removed: 0 };
  }
  if (!/^https?:$/i.test(pageUrl.protocol)) {
    err(`Skip HTML scrape (non-http): ${careersUrl}`);
    return { upserted: 0, removed: 0 };
  }

  let html;
  try {
    const r = await fetch(careersUrl, {
      headers: { "User-Agent": HTML_USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(HTML_FETCH_TIMEOUT_MS),
    });
    if (!r.ok) {
      err(`${hospitalName}: HTTP ${r.status} for ${careersUrl}`);
      return { upserted: 0, removed: 0 };
    }
    html = await r.text();
  } catch (e) {
    err(`${hospitalName}: fetch failed — ${e}`);
    return { upserted: 0, removed: 0 };
  }

  const $ = load(html);
  const linkSeen = new Set();
  /** @type {{ title: string, abs: string }[]} */
  const candidates = [];
  const loc = ((region && String(region).trim()) || "UAE").slice(0, 255);
  const syncedAt = new Date();
  const seenExternalIds = new Set();

  $("a[href]").each((_, el) => {
    if (candidates.length >= maxJobs) return false;
    const rawHref = $(el).attr("href");
    if (!rawHref || rawHref.startsWith("#") || rawHref.toLowerCase().startsWith("javascript:")) return;

    let abs;
    try {
      abs = new URL(rawHref, pageUrl).href.split("#")[0];
    } catch {
      return;
    }
    if (!/^https?:/i.test(abs)) return;
    if (linkSeen.has(abs)) return;
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (title.length < 10 || title.length > 180) return;
    if (NAV_LIKE.test(title)) return;
    if (!hrefLooksJobLike(abs) && !hrefLooksJobLike(title)) return;

    linkSeen.add(abs);
    candidates.push({ title: title.slice(0, 255), abs });
    return undefined;
  });

  let upserted = 0;
  for (const { title, abs } of candidates) {
    const externalId = `html-${urlHash(abs)}`;
    try {
      await upsertJob({
        externalId,
        sourceKey: sourceKey ?? null,
        lastSyncedAt: syncedAt,
        title,
        location: loc,
        hospitalName: hospitalName.slice(0, 255),
        postedDate: null,
        jobUrl: abs,
      });
      seenExternalIds.add(externalId);
      upserted += 1;
    } catch {
      /* ignore row errors */
    }
  }

  let removed = 0;
  if (sourceKey) {
    removed = await pruneSourceJobs(sourceKey, seenExternalIds);
    if (removed > 0) {
      out(`🗑 ${sourceKey}: removed ${removed} stale listing(s)`);
    }
  }

  out(`🌐 ${hospitalName}: HTML scrape — ${upserted} link(s) (${careersUrl})`);
  return { upserted, removed };
}
