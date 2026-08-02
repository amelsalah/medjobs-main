import { fetchSearchSuggestions } from "../queries/suggest.queries.js";
import { parseSuggestQuery, toSuggestContext } from "../schemas/suggest.schema.js";

/** @param {import('fastify').FastifyRequest} request */
/** @param {import('fastify').FastifyReply} reply */
export async function suggestHandler(request, reply) {
  const parsed = parseSuggestQuery(request.query);
  const ctx = toSuggestContext(parsed);
  const result = await fetchSearchSuggestions(parsed.q, ctx, 12);
  return reply.send(result);
}
