/**
 * Applies schema.sql and policies.sql to the Neon database.
 *
 * This is the ONLY place DATABASE_URL is used. It runs on your machine (or in a
 * one-off deploy step), never inside a request handler, and the connection
 * string never reaches the browser.
 *
 * Usage, from the repo root:  npm run migrate
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import './loadEnv.js';

// SQL lives in db/ at the repo root; this runner lives in the backend so it
// resolves @neondatabase/serverless from backend/node_modules.
const sqlDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'DATABASE_URL is not set. Copy .env.example to backend/.env.local and fill it in.',
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

/**
 * Splits a SQL file into statements. Dollar-quoted bodies ($$ ... $$) are kept
 * intact so function and DO blocks are not chopped at their internal semicolons.
 */
function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  for (const line of source.split('\n')) {
    const withoutComment = line.replace(/--.*$/, '');
    const dollarCount = (withoutComment.match(/\$\$/g) ?? []).length;
    if (dollarCount % 2 === 1) inDollarQuote = !inDollarQuote;

    current += `${line}\n`;

    if (!inDollarQuote && withoutComment.trimEnd().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed.replace(/--.*$/gm, '').trim()) statements.push(trimmed);
      current = '';
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function run(file: string): Promise<void> {
  const source = await readFile(join(sqlDir, file), 'utf8');
  const statements = splitStatements(source);

  console.log(`\n${file} — ${statements.length} statements`);

  for (const statement of statements) {
    const label = statement.replace(/\s+/g, ' ').slice(0, 72);
    try {
      await sql.query(statement);
      console.log(`  ok   ${label}`);
    } catch (error) {
      console.error(`  FAIL ${label}`);
      throw error;
    }
  }
}

await run('schema.sql');
await run('policies.sql');

// Prove the security configuration actually landed, rather than assuming it.
const [rls] = (await sql.query(
  `SELECT relrowsecurity, relforcerowsecurity
     FROM pg_class WHERE relname = 'contacts'`,
)) as Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>;

const policies = (await sql.query(
  `SELECT policyname, cmd, qual, with_check
     FROM pg_policies WHERE tablename = 'contacts' ORDER BY cmd`,
)) as Array<{
  policyname: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}>;

console.log('\n--- verification ---');
console.log(`RLS enabled: ${rls?.relrowsecurity}  forced: ${rls?.relforcerowsecurity}`);
console.log(`Policies (${policies.length}):`);
for (const policy of policies) {
  console.log(`  ${policy.cmd.padEnd(6)} ${policy.policyname}`);
  if (policy.qual) console.log(`         USING      ${policy.qual}`);
  if (policy.with_check) console.log(`         WITH CHECK ${policy.with_check}`);
}

if (!rls?.relrowsecurity || policies.length !== 4) {
  console.error('\nExpected RLS enabled and exactly 4 policies. Aborting.');
  process.exit(1);
}

console.log('\nMigration complete.');
