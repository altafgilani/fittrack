# FitTrack Setup Guide

## Prerequisites
- Node.js 18+
- An Anthropic API key (for food photo analysis)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure the API

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:
- Set `ANTHROPIC_API_KEY` to your key from https://console.anthropic.com
- Set `SESSION_SECRET` to a long random string

## 3. Initialize the database

```bash
cd apps/api
npx prisma migrate dev --name init
```

## 4. Run the app

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
