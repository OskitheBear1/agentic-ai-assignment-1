import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/**
 * Loads environment variables from backend/.env.local, then backend/.env.
 *
 * `import 'dotenv/config'` only reads `.env`, which silently leaves .env.local
 * unread — config then falls back to defaults and fails much later with a
 * confusing error. Loading explicitly avoids that.
 *
 * Values already present in process.env win, so Vercel's dashboard variables and
 * anything set on the command line are never overwritten by a local file.
 */
const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..');

config({
  path: [join(backendDir, '.env.local'), join(backendDir, '.env')],
  quiet: true,
});
