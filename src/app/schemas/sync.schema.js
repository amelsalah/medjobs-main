/** @typedef {import('../types/sync.types.js').JobUpsertInput} JobUpsertInput */

/**
 * @param {string | null | undefined} v
 */
export function parsePostedDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const iso = s.slice(0, 10);
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {string} careersUrl
 */
export function htmlSourceKey(careersUrl) {
  try {
    const u = new URL(careersUrl.trim());
    const pathPart = u.pathname.replace(/\/+$/, "") || "/";
    const slug = `${u.hostname}${pathPart}`.replace(/[^a-z0-9.-]/gi, "-").slice(0, 120);
    return `html:${slug}`;
  } catch {
    return null;
  }
}

/**
 * @param {string[]} names
 */
export function mergeHospitalLabels(names) {
  const u = [...new Set(names.map((n) => String(n || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  if (u.length === 0) return "Unknown";
  if (u.length <= 2) return u.join(" · ");
  const s = `${u[0]} · ${u[1]} (+${u.length - 2} more)`;
  return s.length > 250 ? `${s.slice(0, 248)}…` : s;
}

/** Preserve stable external_id prefixes for Oracle portals used before the spreadsheet. */
export const LEGACY_ORACLE_PREFIX = new Map([
  ["https://fa-eutv-saasfaprod1.fa.ocs.oraclecloud.com|CX_1", "seha"],
  ["https://eiby.fa.em2.oraclecloud.com|CX_1", "nmc1"],
  ["https://eiby.fa.em2.oraclecloud.com|CX_1001", "nmc1001"],
  ["https://fa-exqb-saasfaprod1.fa.ocs.oraclecloud.com|CX_1003", "skmc"],
  ["https://hcdtgccprod-iayeqy.fa.ocs.oraclecloud.com|CX", "aster"],
  ["https://fa-epvs-saasfaprod1.fa.ocs.oraclecloud.com|CX_1", "american"],
]);

export const ORACLE_FETCH_TIMEOUT_MS = 30_000;
export const HTML_FETCH_TIMEOUT_MS = 25_000;
export const HTML_USER_AGENT = "Mozilla/5.0 (compatible; MedJobsBot/1.0)";
