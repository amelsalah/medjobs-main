import path from "node:path";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import nunjucks from "nunjucks";

import { prisma } from "./app/db/prisma.js";
import { registerRoutes } from "./app/routes.js";
import { startJobSyncScheduler } from "./app/scheduler/jobScheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

async function buildApp() {
  const fastify = Fastify({ logger: true });

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  await fastify.register(fastifyStatic, {
    root: path.join(rootDir, "public", "static"),
    prefix: "/static/",
  });

  await fastify.register(fastifyView, {
    engine: { nunjucks },
    root: path.join(rootDir, "views"),
    viewExt: "njk",
    defaultContext: {},
    options: { autoescape: true },
  });

  await registerRoutes(fastify);

  return fastify;
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = await buildApp();

try {
  await app.listen({ port, host: "0.0.0.0" });
  startJobSyncScheduler(app);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
