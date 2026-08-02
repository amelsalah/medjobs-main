/** @typedef {import('../types/jobs.types.js').JobListQuery} JobListQuery */

import { listQuery } from "./list-query.schema.js";
import { resolveLogoDomain } from "./logo.schema.js";

export const PAGE_SIZE = 10;

const useInsensitive = (process.env.DATABASE_URL ?? "").startsWith("postgresql");

/** @returns {{ mode: 'insensitive' } | Record<string, never>} */
function ic() {
  return useInsensitive ? { mode: "insensitive" } : {};
}

/**
 * @param {import('fastify').FastifyRequest['query']} query
 * @returns {JobListQuery}
 */
export function parseJobListQuery(query) {
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const hospital = typeof query.hospital === "string" ? query.hospital.trim() : "";
  const city = typeof query.city === "string" ? query.city.trim() : "";
  const sort_by = typeof query.sort_by === "string" ? query.sort_by : "date";
  const sort_order = query.sort_order === "asc" ? "asc" : "desc";
  let page = Number.parseInt(String(query.page ?? "1"), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  return { q, hospital, city, sort_by, sort_order, page };
}

/**
 * @param {Pick<JobListQuery, 'q' | 'hospital' | 'city'>} p
 */
export function buildJobWhere(p) {
  /** @type {import('@prisma/client').Prisma.JobWhereInput} */
  const where = {};
  if (p.q) {
    where.OR = [
      { title: { contains: p.q, ...ic() } },
      { location: { contains: p.q, ...ic() } },
      { hospitalName: { contains: p.q, ...ic() } },
    ];
  }
  if (p.hospital) {
    where.hospitalName = { contains: p.hospital, ...ic() };
  }
  if (p.city) {
    where.location = { contains: p.city, ...ic() };
  }
  return where;
}

/**
 * @param {JobListQuery['sort_by']} sortBy
 * @param {JobListQuery['sort_order']} order
 */
export function buildJobOrderBy(sortBy, order) {
  if (sortBy === "facility") return { hospitalName: order };
  if (sortBy === "title") return { title: order };
  return { postedDate: order };
}

/**
 * @param {number} totalPages
 * @param {number} page
 * @param {(n: number) => string} hrefFor
 */
export function buildPageLinks(totalPages, page, hrefFor) {
  if (totalPages <= 1) return [];
  const nums = new Set(
    [1, totalPages, page, page - 1, page + 1, page - 2, page + 2].filter((n) => n >= 1 && n <= totalPages),
  );
  return [...nums]
    .sort((a, b) => a - b)
    .map((num) => ({ num, current: num === page, href: hrefFor(num) }));
}

/**
 * @param {import('@prisma/client').Job} job
 * @returns {import('../types/jobs.types.js').JobRowView}
 */
export function toJobRowView(job) {
  return {
    title: job.title,
    hospital_name: job.hospitalName,
    location: job.location,
    posted_date: job.postedDate ? job.postedDate.toISOString().slice(0, 10) : "",
    job_url: job.jobUrl ?? "",
    logo_domain: resolveLogoDomain(job.hospitalName, job.jobUrl),
    description: null,
    salary: null,
  };
}

/**
 * @param {JobListQuery} filters
 * @param {import('../types/jobs.types.js').JobListBundle} data
 * @param {import('../types/jobs.types.js').LocationPill[]} location_pills
 * @param {import('../types/jobs.types.js').FilterChip[]} active_filters
 */
export function buildJobListViewContext(filters, data, location_pills, active_filters) {
  const { q, hospital, city, sort_by, sort_order } = filters;
  const { totalFiltered, totalJobs, rows, hospital_counts, city_counts } = data;

  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(filters.page, totalPages);
  const jobRows = rows.map(toJobRowView);

  const base = { q, hospital, city, sort_by, sort_order };
  const hrefFor = (num) => listQuery({ ...base, page: num });

  const top_employers = [...data.hospital_counts]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((h) => ({
      ...h,
      href: listQuery({ hospital: h.hospital_name }),
      active: hospital === h.hospital_name,
    }));

  const pagination =
    totalPages > 1
      ? {
          totalPages,
          currentPage: safePage,
          hasPrevious: safePage > 1,
          hasNext: safePage < totalPages,
          prevHref: hrefFor(safePage - 1),
          nextHref: hrefFor(safePage + 1),
          pageLinks: buildPageLinks(totalPages, safePage, hrefFor),
        }
      : null;

  return {
    query: q,
    hospital,
    city,
    sort_by,
    sort_order,
    total_jobs: totalJobs,
    total_filtered: totalFiltered,
    hospital_counts,
    city_counts,
    top_employers,
    jobRows,
    pagination,
    clearFiltersHref: listQuery({
      q: q || undefined,
      hospital: undefined,
      city: undefined,
      sort_by: sort_by || undefined,
      sort_order: sort_order || undefined,
    }),
    clear_all_href: "/",
    active_filters,
    location_pills,
    filters_open: !!(hospital || city || q || sort_by !== "date" || sort_order !== "desc"),
  };
}
