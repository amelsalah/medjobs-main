import { countAllJobs } from "../queries/jobs.queries.js";

/** @param {import('fastify').FastifyRequest} _request */
/** @param {import('fastify').FastifyReply} reply */
export async function healthHandler(_request, reply) {
  const jobCount = await countAllJobs();
  return reply.send({ ok: true, jobCount });
}
