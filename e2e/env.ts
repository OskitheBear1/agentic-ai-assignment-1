import { config } from 'dotenv';

/**
 * Loads the repo-root .env.local for the e2e suite.
 *
 * `import 'dotenv/config'` only reads `.env`, so .env.local would be ignored and
 * the test accounts would look unset. Existing process.env values win, so
 * `TEST_USER_A_EMAIL=... npx playwright test` still overrides the file.
 */
config({ path: ['.env.local', '.env'], quiet: true });
