/**
 * @typedef {object} SyncResult
 * @property {number} upserted
 * @property {number} removed
 */

/**
 * @typedef {object} OracleFetchArgs
 * @property {string} sourceKey
 * @property {string} sourcePrefix
 * @property {string} baseUrl
 * @property {string} siteNumber
 * @property {string} hospitalName
 * @property {number} [limit]
 * @property {number} [maxJobs]
 */

/**
 * @typedef {object} JobUpsertInput
 * @property {string} externalId
 * @property {string | null} sourceKey
 * @property {Date} lastSyncedAt
 * @property {string} title
 * @property {string} location
 * @property {string} hospitalName
 * @property {Date | null} postedDate
 * @property {string | null} jobUrl
 */

/**
 * @typedef {object} SyncLogger
 * @property {(msg: string) => void} [write]
 */

export {};
