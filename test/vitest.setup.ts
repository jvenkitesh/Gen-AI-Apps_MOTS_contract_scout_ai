import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for secrets: read directly from contractiq's own
// .env.local rather than duplicating values into a second env file here.
dotenv.config({ path: path.resolve(__dirname, "../contractiq/.env.local") });

const APP_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

try {
  await fetch(APP_URL, { signal: AbortSignal.timeout(3000) });
} catch {
  throw new Error(
    `\n\nCannot reach ${APP_URL} -- is the ContractIQ dev server running?\n` +
      `Start it with: cd contractiq && npm run dev\n`
  );
}

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[key]) {
    throw new Error(
      `\n\nMissing ${key} -- expected to be set in contractiq/.env.local\n`
    );
  }
}
