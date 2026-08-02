import { prisma } from "../src/app/db/prisma.js";
import { runSync } from "../src/app/queries/oracle.queries.js";

const stdout = { write: (s) => process.stdout.write(`${s}\n`) };
const stderr = { write: (s) => process.stderr.write(`${s}\n`) };

try {
  await runSync(stdout, stderr);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
