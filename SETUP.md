# FitTrack Setup Guide

## Prerequisites
- Node.js 18+
- Docker (for a local PostgreSQL database) — or any Postgres you can point at
- An Anthropic API key (for food photo analysis)

## 1. Install dependencies

```bash
npm install
```

## 2. Start a local database

```bash
docker compose up -d
```

This runs Postgres on `localhost:5432` with user/password/db all `fittrack`.

## 3. Configure the API

```bash
cd apps/api
cp .env.example .env
```

The default `DATABASE_URL` already matches the docker-compose Postgres. Then:
- Set `ANTHROPIC_API_KEY` to your key from https://console.anthropic.com
- Set `SESSION_SECRET` to a long random string

## 4. Create the database tables

```bash
cd apps/api
npx prisma db push
```

## 5. Run the app

From the root:
```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

## Project structure

```
fittrack/
├── apps/
│   ├── api/          Express API + Prisma
│   │   ├── src/
│   │   │   ├── routes/       auth, workouts, goals, food, dashboard
│   │   │   ├── middleware/   auth session check
│   │   │   ├── lib/          prisma client
│   │   │   └── index.ts      entry point
│   │   └── prisma/schema.prisma
│   └── web/          React + Vite + Tailwind
│       └── src/
│           ├── pages/        Dashboard, Workouts, Goals, Food, Login, Register
│           ├── components/   Layout, UI components
│           ├── contexts/     AuthContext
│           └── lib/          api client, utils
```
