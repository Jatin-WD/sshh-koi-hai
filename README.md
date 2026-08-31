# Sshh... Koi Hai?

Private, premium adult partner discovery platform foundation.

## Project Structure

- `client/` React + TypeScript + Vite + Tailwind CSS
- `server/` Node.js + Express + TypeScript + Prisma
- `server/prisma/` Prisma schema and migration history

## Prerequisites

- Node.js 20+
- PostgreSQL 16+

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the package env examples:

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

3. Generate Prisma client and apply the initial migration:

```bash
npm run prisma:generate -w server
npm run prisma:migrate -w server
```

To load fictional demo data, set seed-only environment variables in `server/.env` and run:

```powershell
$env:ADMIN_EMAIL = "admin@example.test"
$env:ADMIN_INITIAL_PASSWORD = "use-a-local-password-of-12-chars-or-more"
$env:DEMO_INITIAL_PASSWORD = "use-a-local-demo-password"
npm run prisma:seed -w server
```

`ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` are required. Demo accounts use `.example.test` addresses and are not real people. If `DEMO_INITIAL_PASSWORD` is omitted, the seed generates a one-run random demo password and prints it to the terminal. Never commit these values or use demo credentials in production.

The migrations add hashed auth tokens, configurable membership plans, discovery preferences, and the admin `BANNED` account status. Configure SMTP in `server/.env` for real email delivery. For checkout, set the Razorpay key ID in `client/.env` and both Razorpay credentials in `server/.env`; the secret remains server-only.

4. Start the client and server in separate terminals:

```bash
npm run dev -w server
npm run dev -w client
```

Or run the containerized stack:

```bash
docker compose --env-file .env.production up --build -d
```

## Build

```bash
npm run build
```

## Health Check

Once the server is running:

```bash
GET http://localhost:4000/api/health
```

Expected response:

```json
{
  "success": true,
  "status": "ok"
}
```

## Notes

- Email/password authentication, HTTP-only cookie sessions, email verification, password reset, and protected account routing are implemented.
- Razorpay orders, server-side signature verification, plan-backed subscription activation, and membership guards are implemented.
- Profile-backed discovery, filters, pagination, block exclusion, and modular weighted recommendations are implemented.
- Matching, private chat, blocking, reporting, and moderation flows are implemented.
- The admin panel is available at `/admin` for users with the `ADMIN` role. API authorization is enforced by backend RBAC; the client route is only a convenience guard.
- Admin users can be bootstrapped by an operator after registration with SQL: `UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';`
- Admin settings preserve compatibility with existing `business_model` and `profile_image_max_count` site settings.
- The server reads environment variables from `server/.env`.
- The client reads environment variables from `client/.env`.
- Docker Compose starts Postgres, the server, and the client container.

## Admin Panel

Run the migration before using admin features:

```bash
npm run prisma:migrate -w server
```

The admin API never returns password hashes or plaintext passwords. It supports dashboard metrics, user status actions, manual profile verification, subscription extension/cancellation, payment and report review, plan management, and site settings including membership mode, minimum age, image limits, branding, support email, and profile completion requirements.

## Production Deployment

1. Copy `.env.production.example` to `.env.production`, replace every placeholder, and keep the file outside version control.
2. Build the images:

```bash
docker compose --env-file .env.production build --pull
```

3. Start Postgres first and wait for its healthcheck:

```bash
docker compose --env-file .env.production up -d db
```

4. Apply migrations:

```bash
docker compose --env-file .env.production run --rm server npx prisma migrate deploy
```

5. Seed only a non-production environment. The seed requires `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` and never embeds credentials in the image:

```bash
docker compose --env-file .env.production run --rm -e ADMIN_EMAIL -e ADMIN_INITIAL_PASSWORD -e DEMO_INITIAL_PASSWORD server npx prisma db seed
```

6. Start the backend and frontend:

```bash
docker compose --env-file .env.production up -d server client
```

The example edge configuration is in `deploy/nginx.conf.example`. Terminate TLS at the edge, proxy `/api/` and `/socket.io/` to port 4000, and proxy the frontend to port 3000. The Compose services bind those ports to localhost and keep Postgres private. The backend healthcheck verifies database connectivity; the server closes Socket.IO, HTTP connections, and Prisma during graceful shutdown.
