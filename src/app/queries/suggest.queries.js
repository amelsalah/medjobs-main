/** @typedef {import('../types/search.types.js').SuggestContext} SuggestContext */

import { prisma } from "../db/prisma.js";
import { mapRowsToSuggestions } from "../schemas/suggest.schema.js";

/**
 * @param {string} q
 */
function likePattern(q) {
  const safe = q.replace(/[%_]/g, "").trim();
  return `%${safe}%`;
}

/**
 * @param {SuggestContext} ctx
 * @param {number} limit
 */
export async function fetchPopularSuggestions(ctx, limit = 8) {
  const [employers, locations, titles] = await Promise.all([
    prisma.$queryRaw`
      SELECT hospital_name AS label, COUNT(*) AS count
      FROM jobs
      GROUP BY hospital_name
      ORDER BY count DESC
      LIMIT 4
    `,
    prisma.$queryRaw`
      SELECT location AS label, COUNT(*) AS count
      FROM jobs
      WHERE location IS NOT NULL AND TRIM(location) != ''
      GROUP BY location
      ORDER BY count DESC
      LIMIT 4
    `,
    prisma.$queryRaw`
      SELECT title AS label, COUNT(*) AS count
      FROM jobs
      GROUP BY title
      ORDER BY count DESC
      LIMIT 4
    `,
  ]);

  const suggestions = [
    ...mapRowsToSuggestions(employers, ctx, "employer"),
    ...mapRowsToSuggestions(locations, ctx, "location"),
    ...mapRowsToSuggestions(titles, ctx, "title"),
  ];

  return { suggestions: suggestions.slice(0, limit) };
}

/**
 * @param {string} q
 * @param {SuggestContext} ctx
 * @param {number} limit
 */
export async function fetchSearchSuggestions(q, ctx, limit = 10) {
  const trimmed = (q || "").trim();
  if (trimmed.length < 2) {
    return fetchPopularSuggestions(ctx, limit);
  }

  const pattern = likePattern(trimmed);
  const [titles, employers, locations] = await Promise.all([
    prisma.$queryRaw`
      SELECT title AS label, COUNT(*) AS count
      FROM jobs
      WHERE title LIKE ${pattern} COLLATE NOCASE
      GROUP BY title
      ORDER BY count DESC
      LIMIT 5
    `,
    prisma.$queryRaw`
      SELECT hospital_name AS label, COUNT(*) AS count
      FROM jobs
      WHERE hospital_name LIKE ${pattern} COLLATE NOCASE
      GROUP BY hospital_name
      ORDER BY count DESC
      LIMIT 4
    `,
    prisma.$queryRaw`
      SELECT location AS label, COUNT(*) AS count
      FROM jobs
      WHERE location LIKE ${pattern} COLLATE NOCASE
        AND TRIM(location) != ''
      GROUP BY location
      ORDER BY count DESC
      LIMIT 4
    `,
  ]);

  const suggestions = [
    ...mapRowsToSuggestions(titles, ctx, "title"),
    ...mapRowsToSuggestions(employers, ctx, "employer"),
    ...mapRowsToSuggestions(locations, ctx, "location"),
  ];

  return { suggestions: suggestions.slice(0, limit) };
}

/**
 * @param {number} [limit]
 */
export async function fetchPopularLocations(limit = 8) {
  const rows = await prisma.$queryRaw`
    SELECT location AS label, COUNT(*) AS count
    FROM jobs
    WHERE location IS NOT NULL AND TRIM(location) != ''
    GROUP BY location
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ label: String(r.label), count: Number(r.count) }));
}
