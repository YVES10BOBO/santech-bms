# SAN-BMS — Quick Setup Guide

## Prerequisites
- Node.js v18+
- PostgreSQL database
- npm or yarn

## 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

## 2. Install Backend Dependencies
```bash
cd backend
npm install
```

## 3. Configure Backend Environment
```bash
cd backend
copy .env.example .env
```
Then edit `.env` and set:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — a strong random secret

## 4. Setup Database
```bash
cd backend
npm run db:migrate    # Run migrations
npm run db:generate   # Generate Prisma client
npm run db:seed       # Seed with default users
```

## 5. Run the Application

Backend (terminal 1):
```bash
cd backend
npm run dev
```

Frontend (terminal 2):
```bash
cd frontend
npm run dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:5000

## Default Login Credentials
| Role | Email | Password |
|---|---|---|
| Super Admin | admin@santech.rw | Admin@2026 |
| HR Admin | hr@santech.rw | Hr@2026 |
| Sales Staff | sales@santech.rw | Sales@2026 |

## API Health Check
```
GET http://localhost:5000/health
```
