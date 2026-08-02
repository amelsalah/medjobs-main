/** @typedef {import('../types/search.types.js').SuggestQuery} SuggestQuery */
/** @typedef {import('../types/search.types.js').SuggestContext} SuggestContext */
/** @typedef {import('../types/search.types.js').Suggestion} Suggestion */
/** @typedef {import('../types/search.types.js').SuggestionType} SuggestionType */

import { listQuery } from "./list-query.schema.js";

/**
 * @param {import('fastify').FastifyRequest['query']} query
 * @returns {SuggestQuery}
 */
export function parseSuggestQuery(query) {
  return {
    q: typeof query.q === "string" ? query.q : "",
    hospital: typeof query.hospital === "string" ? query.hospital.trim() : "",
    city: typeof query.city === "string" ? query.city.trim() : "",
  };
}

/**
 * @param {SuggestQuery} parsed
 * @returns {SuggestContext}
 */
export function toSuggestContext(parsed) {
  return {
    hospital: parsed.hospital || undefined,
    city: parsed.city || undefined,
  };
}

/**
 * @param {SuggestionType} type
 * @param {string} label
 * @param {number} count
 * @param {SuggestContext} ctx
 * @returns {Suggestion}
 */
export function makeSuggestion(type, label, count, ctx) {
  const params = { ...ctx, page: undefined };
  if (type === "title") params.q = label;
  else if (type === "employer") params.hospital = label;
  else if (type === "location") params.city = label;

  return {
    type,
    label,
    meta: `${count} role${count === 1 ? "" : "s"}`,
    href: listQuery(params),
  };
}

/**
 * @param {import('../types/jobs.types.js').JobListQuery} p
 * @returns {import('../types/jobs.types.js').FilterChip[]}
 */
export function buildActiveFilters(p) {
  const base = {
    sort_by: p.sort_by || undefined,
    sort_order: p.sort_order || undefined,
  };
  /** @type {import('../types/jobs.types.js').FilterChip[]} */
  const chips = [];

  if (p.q) {
    chips.push({
      key: "q",
      label: `Search: ${p.q}`,
      removeHref: listQuery({ ...base, q: undefined, hospital: p.hospital, city: p.city }),
    });
  }
  if (p.hospital) {
    chips.push({
      key: "hospital",
      label: `Employer: ${p.hospital}`,
      removeHref: listQuery({ ...base, q: p.q, hospital: undefined, city: p.city }),
    });
  }
  if (p.city) {
    chips.push({
      key: "city",
      label: `Location: ${p.city}`,
      removeHref: listQuery({ ...base, q: p.q, hospital: p.hospital, city: undefined }),
    });
  }
  if (p.sort_by && p.sort_by !== "date") {
    chips.push({
      key: "sort_by",
      label: `Sort: ${p.sort_by}`,
      removeHref: listQuery({
        q: p.q,
        hospital: p.hospital,
        city: p.city,
        sort_by: undefined,
        sort_order: p.sort_order,
      }),
    });
  }
  if (p.sort_order && p.sort_order !== "desc") {
    chips.push({
      key: "sort_order",
      label: "Oldest first",
      removeHref: listQuery({
        q: p.q,
        hospital: p.hospital,
        city: p.city,
        sort_by: p.sort_by,
        sort_order: undefined,
      }),
    });
  }

  return chips;
}

/**
 * @param {string} location
 * @param {import('../types/jobs.types.js').JobListQuery} p
 */
export function locationPillHref(location, p) {
  const active = p.city === location;
  return listQuery({
    q: p.q,
    hospital: p.hospital,
    city: active ? undefined : location,
    sort_by: p.sort_by,
    sort_order: p.sort_order,
  });
}

/**
 * @param {Array<{ label: string, count: number }>} rows
 * @param {SuggestContext} ctx
 * @param {SuggestionType} type
 */
export function mapRowsToSuggestions(rows, ctx, type) {
  return rows.map((row) => makeSuggestion(type, String(row.label), Number(row.count), ctx));
}
