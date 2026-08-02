/**
 * @param {string | null | undefined} careersUrl
 * @returns {{ baseUrl: string, siteNumber: string, origin: string } | null}
 */
export function parseOracleCandidateExperienceUrl(careersUrl) {
  if (!careersUrl || typeof careersUrl !== "string") return null;
  let u;
  try {
    u = new URL(careersUrl.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (!host.includes("oraclecloud.com") && !host.endsWith("oracle.com")) return null;
  if (!u.pathname.includes("/hcmUI/CandidateExperience/")) return null;
  const m = u.pathname.match(/\/sites\/([^/]+)/i);
  if (!m) return null;
  const siteNumber = m[1];
  const origin = u.origin;
  const baseUrl = `${origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`;
  return { baseUrl, siteNumber, origin };
}

/**
 * @param {string} origin
 * @param {string} siteNumber
 */
export function oracleSourcePrefix(origin, siteNumber) {
  let host = "";
  try {
    host = new URL(origin).hostname.replace(/\./g, "-");
  } catch {
    host = "unknown";
  }
  return `o-${host}-${siteNumber}`.replace(/[^a-z0-9-_]/gi, "").toLowerCase().slice(0, 56);
}
