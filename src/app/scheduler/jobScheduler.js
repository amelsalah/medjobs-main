import cron from "node-cron";
import { runSync } from "../queries/oracle.queries.js";

/** @type {boolean} */
let syncRunning = false;

/**
 * @param {import('fastify').FastifyBaseLogger} [log]
 */
function makeLogger(log) {
  return {
    stdout: {
      write: (msg) => {
        if (log) log.info(msg);
        else console.log(msg);
      },
    },
    stderr: {
      write: (msg) => {
        if (log) log.error(msg);
        else console.error(msg);
      },
    },
  };
}

/**
 * @param {import('fastify').FastifyBaseLogger} [log]
 */
export async function runScheduledSync(log) {
  if (syncRunning) {
    log?.warn("Job sync skipped — previous run still in progress");
    return null;
  }
  syncRunning = true;
  const started = Date.now();
  const { stdout, stderr } = makeLogger(log);
  try {
    log?.info("Job sync started");
    const result = await runSync(stdout, stderr);
    log?.info(
      { upserted: result.upserted, removed: result.removed, ms: Date.now() - started },
      "Job sync finished",
    );
    return result;
  } catch (err) {
    log?.error(err, "Job sync failed");
    throw err;
  } finally {
    syncRunning = false;
  }
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export function startJobSyncScheduler(fastify) {
  const enabled = process.env.SYNC_SCHEDULER !== "false";
  const cronExpr = process.env.SYNC_CRON ?? "0 * * * *";
  const runOnStart = process.env.SYNC_ON_START !== "false";

  if (enabled) {
    if (!cron.validate(cronExpr)) {
      fastify.log.error({ cron: cronExpr }, "Invalid SYNC_CRON — scheduler disabled");
      return;
    }
    cron.schedule(cronExpr, () => {
      runScheduledSync(fastify.log).catch(() => {});
    });
    fastify.log.info({ cron: cronExpr }, "Job sync scheduler enabled (every hour by default)");
  } else {
    fastify.log.info("Job sync scheduler disabled (SYNC_SCHEDULER=false)");
  }

  if (runOnStart && enabled) {
    runScheduledSync(fastify.log).catch(() => {});
  }
}
