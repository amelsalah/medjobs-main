/** @typedef {import('../types/sync.types.js').SyncLogger} SyncLogger */

import { loadHospitalsRegistry } from "./hospitals.queries.js";
import { pruneSourceJobs, upsertJob } from "./sync.queries.js";
import { scrapeCareersHtml } from "./html-scrape.queries.js";
import { htmlSourceKey, LEGACY_ORACLE_PREFIX, ORACLE_FETCH_TIMEOUT_MS, mergeHospitalLabels, parsePostedDate } from "../schemas/sync.schema.js";
import { oracleSourcePrefix, parseOracleCandidateExperienceUrl } from "../schemas/oracle.schema.js";

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

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {object} args
 * @param {string} args.sourceKey
 * @param {string} args.sourcePrefix
 * @param {string} args.baseUrl
 * @param {string} args.siteNumber
 * @param {string} args.hospitalName
 * @param {number} [args.limit]
 * @param {number} [args.maxJobs]
 * @param {SyncLogger} [args.stdout]
 * @param {SyncLogger} [args.stderr]
 */
export async function fetchOracleCeNoConstraints({
  sourceKey,
  sourcePrefix,
  baseUrl,
  siteNumber,
  hospitalName,
  limit = 50,
  maxJobs = 2000,
  stdout,
  stderr,
}) {
  const out = (msg) => logLine(stdout, msg);
  const err = (msg) => logErr(stderr, msg);

  const headers = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  };

  let upserted = 0;
  let hadError = false;
  let gotResponse = false;
  const seenExternalIds = new Set();
  const syncedAt = new Date();

  for (let offset = 0; offset < maxJobs; offset += limit) {
    const params = new URLSearchParams({
      onlyData: "true",
      expand: "requisitionList.workLocation,requisitionList.requisitionFlexFields",
      finder: `findReqs;siteNumber=${siteNumber},limit=${limit},offset=${offset},sortBy=POSTING_DATES_DESC`,
    });

    let r;
    try {
      r = await fetch(`${baseUrl}?${params}`, {
        headers,
        signal: AbortSignal.timeout(ORACLE_FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      err(`${sourcePrefix.toUpperCase()} request failed: ${e}`);
      hadError = true;
      break;
    }

    if (!r.ok) {
      const text = await r.text();
      err(`${sourcePrefix.toUpperCase()} API ${r.status}: ${text.slice(0, 300)}`);
      hadError = true;
      break;
    }

    gotResponse = true;

    /** @type {{ items?: Array<{ requisitionList?: Array<Record<string, unknown>> }> }} */
    const data = await r.json();
    const items = data.items ?? [];

    const reqs = [];
    for (const it of items) {
      reqs.push(...(it.requisitionList ?? []));
    }

    if (reqs.length === 0) break;

    const originBase = baseUrl.split("/hcmRestApi")[0] || "";

    for (const j of reqs) {
      const jid = j.Id;
      if (!jid) continue;

      const externalId = `${sourcePrefix}-${jid}`;
      const jobUrl = `${originBase}/hcmUI/CandidateExperience/en/sites/${siteNumber}/requisitions/preview/${jid}`;

      await upsertJob({
        externalId,
        sourceKey,
        lastSyncedAt: syncedAt,
        title: String(j.Title ?? ""),
        location: String(j.PrimaryLocation ?? ""),
        hospitalName,
        postedDate: parsePostedDate(/** @type {string} */ (j.PostedDate)),
        jobUrl,
      });
      seenExternalIds.add(externalId);
      upserted += 1;
      if (upserted >= maxJobs) break;
    }

    if (upserted >= maxJobs) break;
    if (reqs.length < limit) break;
  }

  let removed = 0;
  if (gotResponse && !hadError) {
    removed = await pruneSourceJobs(sourceKey, seenExternalIds);
    if (removed > 0) {
      out(`🗑 ${sourceKey}: removed ${removed} stale listing(s)`);
    }
  }

  out(`✅ ${hospitalName}: Oracle CE — ${upserted} job(s) (${sourcePrefix})`);
  return { upserted, removed };
}

/**
 * @param {SyncLogger} [stdout]
 * @param {SyncLogger} [stderr]
 * @param {{ registryPath?: string }} [opts]
 */
export async function runSync(stdout, stderr, opts = {}) {
  let upserted = 0;
  let removed = 0;
  /** @type {Map<string, { baseUrl: string, siteNumber: string, origin: string, names: string[] }>} */
  const oracleBuckets = new Map();

  const rows = loadHospitalsRegistry(opts.registryPath);

  for (const row of rows) {
    const name = row["Hospital / Group"];
    const url = row["Careers URL"];
    if (!url || typeof url !== "string") continue;
    const parsed = parseOracleCandidateExperienceUrl(url);
    if (parsed) {
      const key = `${parsed.origin}|${parsed.siteNumber}`;
      if (!oracleBuckets.has(key)) {
        oracleBuckets.set(key, {
          baseUrl: parsed.baseUrl,
          siteNumber: parsed.siteNumber,
          origin: parsed.origin,
          names: [],
        });
      }
      oracleBuckets.get(key).names.push(String(name || "Employer"));
    }
  }

  for (const [, bucket] of oracleBuckets) {
    const key = `${bucket.origin}|${bucket.siteNumber}`;
    const sourcePrefix = LEGACY_ORACLE_PREFIX.get(key) ?? oracleSourcePrefix(bucket.origin, bucket.siteNumber);
    const sourceKey = `oracle:${sourcePrefix}`;
    const hospitalName = mergeHospitalLabels(bucket.names);
    const result = await fetchOracleCeNoConstraints({
      sourceKey,
      sourcePrefix,
      baseUrl: bucket.baseUrl,
      siteNumber: bucket.siteNumber,
      hospitalName,
      stdout,
      stderr,
    });
    upserted += result.upserted;
    removed += result.removed;
  }

  for (const row of rows) {
    const hospitalName = String(row["Hospital / Group"] || "Employer").slice(0, 255);
    const region = row["Emirate(s)"] ? String(row["Emirate(s)"]) : "";
    const url = row["Careers URL"];
    if (!url || typeof url !== "string") continue;
    if (parseOracleCandidateExperienceUrl(url)) continue;

    const result = await scrapeCareersHtml({
      careersUrl: url.trim(),
      hospitalName,
      region,
      sourceKey: htmlSourceKey(url.trim()),
      maxJobs: 45,
      stdout,
      stderr,
    });
    upserted += result.upserted;
    removed += result.removed;
    await delay(350);
  }

  const msg = `✅ Sync done — ${upserted} upserted, ${removed} removed (Oracle + HTML where applicable)`;
  if (stdout?.write) stdout.write(msg);
  else console.log(msg);

  return { upserted, removed };
}
