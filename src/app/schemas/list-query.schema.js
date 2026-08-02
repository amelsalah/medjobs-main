/**
 * @param {Record<string, string | undefined | null>} params
 */
export function buildQueryString(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/**
 * @param {object} opts
 * @param {number} [opts.page]
 * @param {string} [opts.q]
 * @param {string} [opts.hospital]
 * @param {string} [opts.city]
 * @param {string} [opts.sort_by]
 * @param {string} [opts.sort_order]
 */
export function listQuery(opts) {
  let pageParam;
  if (opts.page != null && opts.page !== "") {
    const pageNum = typeof opts.page === "number" ? opts.page : Number.parseInt(String(opts.page), 10);
    if (Number.isFinite(pageNum) && pageNum > 1) pageParam = String(pageNum);
  }
  return buildQueryString({
    page: pageParam,
    q: opts.q || undefined,
    hospital: opts.hospital || undefined,
    city: opts.city || undefined,
    sort_by: opts.sort_by || undefined,
    sort_order: opts.sort_order || undefined,
  });
}
