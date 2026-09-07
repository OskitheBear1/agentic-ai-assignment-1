import { defineConfig, devices } from '@playwright/test';
import './e2e/env';

/**
 * End-to-end tests that double as the README's evidence generator.
 *
 * Every spec writes a screenshot into docs/, so the grading artifacts are
 * reproducible rather than hand-captured: `npm run test:e2e` regenerates them.
 *
 * Point it at production instead of localhost with:
 *   E2E_BASE_URL=https://<your-app>.vercel.app npm run test:e2e
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const USE_LOCAL_SERVERS = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  // One retry always. Against a deployed serverless backend the first request
  // after an idle period pays a cold start, which occasionally exceeds an
  // assertion timeout; that is infrastructure latency, not a broken app.
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: USE_LOCAL_SERVERS
    ? [
        {
          command: 'npm --prefix backend run dev',
          url: 'http://localhost:3000/health',
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: 'npm --prefix frontend run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ]
    : undefined,
});
