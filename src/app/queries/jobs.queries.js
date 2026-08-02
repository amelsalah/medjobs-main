/** @typedef {import('../types/jobs.types.js').JobListQuery} JobListQuery */
/** @typedef {import('../types/jobs.types.js').JobListBundle} JobListBundle */

import { prisma } from "../db/prisma.js";
import { PAGE_SIZE, buildJobOrderBy, buildJobWhere } from "../schemas/jobs.schema.js";

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
 * @param {JobListQuery} filters
 * @returns {Promise<JobListBundle>}
 */
export async function fetchJobListBundle(filters) {
  const where = buildJobWhere(filters);
  const [totalFiltered, totalJobs, hospitalAgg, cityAgg] = await Promise.all([
    countJobs(where),
    countAllJobs(),
    groupJobsByHospital(),
    groupJobsByLocation(),
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
    })),
    city_counts: cityAgg.map((c) => ({
      location: c.location,
      total: c._count.id,
    })),
  };
}
