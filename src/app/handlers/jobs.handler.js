import { fetchJobListBundle } from "../queries/jobs.queries.js";
import { fetchPopularLocations } from "../queries/suggest.queries.js";
import {
  buildActiveFilters,
  locationPillHref,
} from "../schemas/suggest.schema.js";
import { buildJobListViewContext, parseJobListQuery } from "../schemas/jobs.schema.js";

/** @param {import('fastify').FastifyRequest} request */
/** @param {import('fastify').FastifyReply} reply */
export async function jobListHandler(request, reply) {
  const filters = parseJobListQuery(request.query);
  const [data, popular_locations] = await Promise.all([
    fetchJobListBundle(filters),
    fetchPopularLocations(8),
  ]);

  const active_filters = buildActiveFilters(filters);
  const location_pills = popular_locations.map((loc) => ({
    ...loc,
    href: locationPillHref(loc.label, filters),
    active: filters.city === loc.label,
  }));

  const viewContext = buildJobListViewContext(filters, data, location_pills, active_filters);
  return reply.view("job_list", viewContext);
}
