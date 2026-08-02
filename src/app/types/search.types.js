/**
 * @typedef {'title' | 'employer' | 'location'} SuggestionType
 */

/**
 * @typedef {object} Suggestion
 * @property {SuggestionType} type
 * @property {string} label
 * @property {string} meta
 * @property {string} href
 */

/**
 * @typedef {object} SuggestQuery
 * @property {string} q
 * @property {string} hospital
 * @property {string} city
 */

/**
 * @typedef {object} SuggestContext
 * @property {string} [hospital]
 * @property {string} [city]
 * @property {string} [sort_by]
 * @property {string} [sort_order]
 */

export {};
