/** @typedef {import('../types/jobs.types.js').JobListQuery} JobListQuery */
/** @typedef {import('../types/jobs.types.js').JobListBundle} JobListBundle */

import { prisma } from "../db/prisma.js";
import { PAGE_SIZE, buildJobOrderBy, buildJobWhere } from "../schemas/jobs.schema.js";
import { resolveLogoDomain } from "../schemas/logo.schema.js";

/**
 * @param {import('@prisma/client').Prisma.JobWhereInput} where
 */
export async function countJobs(where) {
  return prisma.job.count({ where });
}

export async function countAllJobs() {
  return prisma.job.count();
}

export async function groupJobsByHospital() {
  return prisma.job.groupBy({
    by: ["hospitalName"],
    _count: { id: true },
    orderBy: { hospitalName: "asc" },
  });
}

export async function groupJobsByLocation() {
  return prisma.job.groupBy({
    by: ["location"],
    _count: { id: true },
    orderBy: { location: "asc" },
  });
}

/**
 * One representative job_url per employer, used to derive a logo domain.
 * @returns {Promise<Map<string, string | null>>}
 */
export async function fetchHospitalLogoDomains() {
  const rows = await prisma.job.findMany({
    where: { jobUrl: { not: null } },
    distinct: ["hospitalName"],
    select: { hospitalName: true, jobUrl: true },
  });
  const map = new Map();
  for (const row of rows) {
    map.set(row.hospitalName, resolveLogoDomain(row.hospitalName, row.jobUrl));
  }
  return map;
}

/**
 * @param {JobListQuery} filters
 * @returns {Promise<JobListBundle>}
 */
export async function fetchJobListBundle(filters) {
  const where = buildJobWhere(filters);
  const [totalFiltered, totalJobs, hospitalAgg, cityAgg, logoDomains] = await Promise.all([
    countJobs(where),
    countAllJobs(),
    groupJobsByHospital(),
    groupJobsByLocation(),
    fetchHospitalLogoDomains(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(filters.page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const rows = await prisma.job.findMany({
    where,
    orderBy: buildJobOrderBy(filters.sort_by, filters.sort_order),
    skip,
    take: PAGE_SIZE,
  });

  return {
    totalFiltered,
    totalJobs,
    rows,
    hospital_counts: hospitalAgg.map((h) => ({
      hospital_name: h.hospitalName,
      total: h._count.id,
      logo_domain: logoDomains.get(h.hospitalName) ?? null,
    })),
    city_counts: cityAgg.map((c) => ({
      location: c.location,
      total: c._count.id,
    })),
  };
}
