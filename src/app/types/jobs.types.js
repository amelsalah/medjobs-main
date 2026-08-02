/**
 * @typedef {object} JobListQuery
 * @property {string} q
 * @property {string} hospital
 * @property {string} city
 * @property {'date' | 'facility' | 'title'} sort_by
 * @property {'asc' | 'desc'} sort_order
 * @property {number} page
 */

/**
 * @typedef {object} JobRowView
 * @property {string} title
 * @property {string} hospital_name
 * @property {string} location
 * @property {string} posted_date
 * @property {string} job_url
 * @property {null} description
 * @property {null} salary
 */

/**
 * @typedef {object} CountAggregate
 * @property {string} hospital_name
 * @property {number} total
 */

/**
 * @typedef {object} LocationAggregate
 * @property {string} location
 * @property {number} total
 */

/**
 * @typedef {object} PaginationLink
 * @property {number} num
 * @property {boolean} current
 * @property {string} href
 */

/**
 * @typedef {object} PaginationView
 * @property {number} totalPages
 * @property {number} currentPage
 * @property {boolean} hasPrevious
 * @property {boolean} hasNext
 * @property {string} prevHref
 * @property {string} nextHref
 * @property {PaginationLink[]} pageLinks
 */

/**
 * @typedef {object} FilterChip
 * @property {string} key
 * @property {string} label
 * @property {string} removeHref
 */

/**
 * @typedef {object} LocationPill
 * @property {string} label
 * @property {number} count
 * @property {string} href
 * @property {boolean} active
 */

/**
 * @typedef {object} JobListBundle
 * @property {number} totalFiltered
 * @property {number} totalJobs
 * @property {import('@prisma/client').Job[]} rows
 * @property {CountAggregate[]} hospital_counts
 * @property {LocationAggregate[]} city_counts
 */

export {};
