import { healthHandler } from "./handlers/health.handler.js";
import { suggestHandler } from "./handlers/suggest.handler.js";
import { jobListHandler } from "./handlers/jobs.handler.js";

/** @param {import('fastify').FastifyInstance} fastify */
export async function registerRoutes(fastify) {
  fastify.get("/health", healthHandler);
  fastify.get("/api/suggest", suggestHandler);
  fastify.get("/", jobListHandler);
}
