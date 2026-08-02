/** @typedef {import('../types/sync.types.js').JobUpsertInput} JobUpsertInput */

import { prisma } from "../db/prisma.js";

/**
 * @param {JobUpsertInput} data
 */
export async function upsertJob(data) {
  return prisma.job.upsert({
    where: { externalId: data.externalId },
    create: data,
    update: {
      sourceKey: data.sourceKey,
      lastSyncedAt: data.lastSyncedAt,
      title: data.title,
      location: data.location,
      hospitalName: data.hospitalName,
      postedDate: data.postedDate,
      jobUrl: data.jobUrl,
    },
  });
}

/**
 * @param {string} sourceKey
 * @param {Set<string>} seenExternalIds
 */
export async function pruneSourceJobs(sourceKey, seenExternalIds) {
  if (!sourceKey) return 0;
  const seen = [...seenExternalIds];
  const where =
    seen.length > 0 ? { sourceKey, externalId: { notIn: seen } } : { sourceKey };
  const result = await prisma.job.deleteMany({ where });
  return result.count;
}
