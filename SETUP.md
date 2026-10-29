# SAN-BMS — Local Setup Guide

How to run SAN-BMS on your own computer. For what the system does, see [README.md](README.md); for
what changed and when, see [CHANGELOG.md](CHANGELOG.md).

## Prerequisites
- Node.js 18 or newer
- pnpm (`npm install -g pnpm`) — both apps use pnpm lockfiles
- A PostgreSQL database: a free [Neon](https://neon.tech) project, or PostgreSQL on your computer

## 1. Install dependencies
```powershell
cd backend
pnpm install
cd ../frontend
pnpm install
```

## 2. Configure the backend
```powershell
cd backend
copy .env.example .env
```
Then edit `backend/.env`:

| Key | Value |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (on Neon: the pooled connection string) |
| `DIRECT_URL` | Direct connection string, used by migrations (on Neon: the same string without `-pooler`; locally: same as `DATABASE_URL`) |
| `JWT_SECRET` | A long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `http://localhost:3000` |
| `PORT` | `5000` |

The `SMTP_*` keys are not used yet (email delivery is planned). `.env` is gitignored — never commit it.

The frontend needs no configuration for local work: it sends `/api` calls to `http://localhost:5000`.

## 3. Create the tables and load the demo data
```powershell
cd backend
pnpm db:migrate     # applies all migrations and generates the Prisma client
pnpm db:seed        # demo data for every module — safe to run again
```

## 4. Run the application

Backend (terminal 1):
```powershell
cd backend
pnpm dev            # → http://localhost:5000
```

Frontend (terminal 2):
```powershell
cd frontend
pnpm dev            # → http://localhost:3000
```

## Demo logins

Every demo account uses the password **`Santech@2026`**:

| Role | Email |
|---|---|
| Super Admin | `admin@santech.rw` |
| Admin (HR) | `claire@santech.rw` |
| Finance Manager | `david@santech.rw` |
| Sales Manager | `paul@santech.rw` |
| Sales Staff | `alice@santech.rw` |
| Project Manager | `bob@santech.rw` |
| Employee | `frank@santech.rw` |

The full list is in [README.md](README.md#live-demo--login-credentials).

## API health check
```
GET http://localhost:5000/health
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `EPERM … query_engine` during `prisma generate` (Windows) | A running backend locks the Prisma engine. Stop `pnpm dev`, run the command again, then restart. |
| Login says it cannot reach the server | The backend isn't running (locally) or Render is waking up (live site) — wait 30 seconds and retry. |
| "Too many failed attempts" | 10 wrong passwords within 15 minutes pause logins for 15 minutes. |
| New demo data missing on the live site | Render does not run the seed. Run `pnpm db:seed` in `backend` (it uses the Neon URL in `backend/.env`). |
