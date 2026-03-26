import dotenv from "dotenv";

dotenv.config();

const now = () => new Date().toISOString();

console.log(`[ViralLab Worker] boot at ${now()}`);
console.log("[ViralLab Worker] queue handlers are not implemented yet.");

setInterval(() => {
  console.log(`[ViralLab Worker] heartbeat ${now()}`);
}, 30000);
