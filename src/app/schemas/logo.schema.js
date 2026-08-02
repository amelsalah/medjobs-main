// Career sites hosted on generic ATS/HCM platforms don't carry the employer's
// own branding, so a favicon lookup there would show the platform's icon
// instead of the hospital's — better to fall back to an initials badge.
const ATS_HOST_PATTERNS = [
  /oraclecloud\.com$/i,
  /icims\.com$/i,
  /webhr\.co$/i,
  /taleo\.net$/i,
  /successfactors\.(com|eu)$/i,
  /myworkdayjobs\.com$/i,
  /workday\.com$/i,
  /smartrecruiters\.com$/i,
  /bamboohr\.com$/i,
  /greenhouse\.io$/i,
  /lever\.co$/i,
  /breezy\.hr$/i,
  /personio\.(com|de)$/i,
  /recruitee\.com$/i,
  /jobvite\.com$/i,
  /freshteam\.com$/i,
  /zohorecruit\.com$/i,
  /applytojob\.com$/i,
  /jazzhr\.com$/i,
];

/**
 * @param {string | null | undefined} rawUrl
 * @returns {string | null}
 */
export function logoDomainFromUrl(rawUrl) {
  if (!rawUrl) return null;
  let hostname;
  try {
    hostname = new URL(rawUrl).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
  if (!hostname) return null;
  if (ATS_HOST_PATTERNS.some((re) => re.test(hostname))) return null;
  return hostname;
}

// Many employers post through an Oracle/ATS-hosted careers portal that carries
// no brand identity, so their real public domain has to be looked up by name
// instead of derived from the job URL. Verified by hostname/title as of 2026-08-02.
const MANUAL_LOGO_DOMAINS = [
  [/sheikh shakhbout|\bssmc\b/i, "ssmc.ae"],
  [/skmca/i, "skmca.ae"],
  [/al ain hospital|al rahba|\bseha\b/i, "seha.ae"],
  [/king.?s college/i, "kingscollegehospitaldubai.com"],
  [/fakeeh/i, "fakeeh.care"],
  [/\baster\b/i, "asterhospitals.ae"],
  [/medcare/i, "medcare.ae"],
  [/\bnmc\b/i, "nmc.ae"],
  [/american hospital/i, "ahdubai.com"],
];

/**
 * @param {string | null | undefined} hospitalName
 * @returns {string | null}
 */
export function manualLogoDomain(hospitalName) {
  if (!hospitalName) return null;
  for (const [pattern, domain] of MANUAL_LOGO_DOMAINS) {
    if (pattern.test(hospitalName)) return domain;
  }
  return null;
}

/**
 * @param {string | null | undefined} hospitalName
 * @param {string | null | undefined} jobUrl
 * @returns {string | null}
 */
export function resolveLogoDomain(hospitalName, jobUrl) {
  return logoDomainFromUrl(jobUrl) ?? manualLogoDomain(hospitalName);
}
