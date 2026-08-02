/** @typedef {import('../types/hospital.types.js').HospitalRow} HospitalRow */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} [customPath]
 * @returns {HospitalRow[]}
 */
export function loadHospitalsRegistry(customPath) {
  const p = customPath || path.join(__dirname, "..", "..", "..", "data", "uae_hospitals.json");
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("uae_hospitals.json must be an array");
  return data;
}
