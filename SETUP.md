# Neon setup — the four values you need

Do this once in the Neon console, then paste the results into your `.env.local`
files. Nothing in this project works until these exist.

## 1. Create the project

https://console.neon.tech → **New Project**

- Name: `agentic-ai-assignment-1`
- Postgres version: the default is fine
- Region: pick the one closest to you

## 2. Enable Managed Better Auth

In the project sidebar: **Auth** → **Enable Managed Better Auth**.

Copy the **Auth URL**. It looks like:

```
https://ep-something-12345678.us-west-2.aws.neon.tech/neondb/auth
```

Enable **Email and password** as a sign-in method if it is not on by default.

## 3. Enable the Data API

In the project sidebar: **Data API**.

- Auth provider: **Managed Better Auth** (should already be selected)
- Tick **Grant public schema access**
- Click **Enable Data API**

Copy the **Data API URL**. It looks like:

```
https://ep-something-12345678.apirest.us-west-2.aws.neon.tech/neondb/rest/v1
```

## 4. Copy the connection string

Project dashboard → **Connect** → copy the `postgresql://…` string.

**This one is a secret.** It goes in `backend/.env.local` only, and only
`db/migrate.ts` ever reads it. It must never be added to the frontend Vercel
project.

---

## 5. Fill in the env files

```bash
cp .env.example backend/.env.local
cp .env.example frontend/.env.local
```

`frontend/.env.local` needs:

```
VITE_NEON_AUTH_URL=<auth url from step 2>
VITE_NEON_DATA_API_URL=<data api url from step 3>
VITE_API_URL=http://localhost:3000
```

`backend/.env.local` needs:

```
NEON_AUTH_URL=<auth url from step 2>
NEON_DATA_API_URL=<data api url from step 3>
DATABASE_URL=<connection string from step 4>
FRONTEND_URL=http://localhost:5173
PORT=3000

TEST_USER_A_EMAIL=<a test email>
TEST_USER_A_PASSWORD=<a password of 8+ characters>
TEST_USER_B_EMAIL=<a second test email>
TEST_USER_B_PASSWORD=<a password of 8+ characters>
```

The two test accounts are created automatically the first time the integration
tests run — you do not need to sign them up by hand.

## 6. Create the schema

```bash
npm run migrate
```

It prints every statement it runs, then the RLS policies it verified. It fails
loudly if RLS is not enabled or if fewer than four policies exist.

## 7. Trusted origins (before deploying)

Once the frontend is live on Vercel, go back to **Auth** in the Neon console and
add the Vercel domain to the trusted origins list. Sign-in will fail from the
deployed site until you do.
