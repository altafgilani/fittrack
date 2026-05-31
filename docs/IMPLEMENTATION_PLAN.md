# FitTrack — Implementation Plan

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast dev, strong typing |
| Styling | Tailwind CSS | Rapid UI, utility-first |
| Charts | Recharts | Lightweight, composable |
| Backend | Node.js + Express (TypeScript) | Simple REST API, same language |
| Database | SQLite + Prisma ORM | Zero-config local dev, great TS support |
| Auth | Session-based (express-session + bcrypt) | Self-hosted, no vendor lock-in |
| AI / Food Analysis | Anthropic Claude API (vision) | Accurate food recognition from images |
| File Storage | Local disk (upgradeable to R2/S3) | Simple for dev; swap in prod |

---

## Architecture

```
Browser (React SPA)
    │
    ├── REST API calls ──► Express API Server (port 4000)
    │                           │
    │                           ├── Prisma ──► SQLite (dev.db)
    │                           ├── express-session ──► Sessions table
    │                           ├── /uploads ◄── Food photo storage
    │                           └── Anthropic API ◄── Food photo analysis
    │
    └── Vite dev server (port 5173) — proxies /api to 4000
```

---

## Data Models

```
User          id, email, passwordHash, name, createdAt
Session       id, userId, expiresAt
Workout       id, userId, name, date, durationMins, notes, effort
Exercise      id, workoutId, name, category, sets, reps, weightKg, distanceKm, durationSecs
Goal          id, userId, title, type, targetValue, currentValue, unit, deadline, completed
FoodLog       id, userId, date, mealType, photoUrl, aiResult(JSON), confirmedCalories/Macros
DailyCalorie  id, userId, date, calorieBudget, caloriesConsumed, caloriesBurned
```

---

## Food AI Flow

```
User uploads photo
  → stored to /uploads
  → POST /api/food/analyze
  → API reads file, base64-encodes it
  → Sends to Claude (claude-opus-4-8) with vision prompt:
      "Identify all food items, estimate portions,
       return JSON: { items: [...], total: {...}, confidence, notes }"
  → Parse JSON response
  → Return to frontend for user confirmation
  → User edits if needed → POST /api/food to save confirmed values
  → DailyCalorie totals updated automatically
```

---

## Development Phases

### Phase 1 — Foundation ✅
- [x] Monorepo scaffold: `apps/api` + `apps/web`
- [x] Prisma schema + SQLite database
- [x] Session-based auth (register, login, logout, /me)
- [x] React app shell with protected routes and layout

### Phase 2 — Workout Logging ✅
- [x] Create/edit/delete workout sessions
- [x] Log exercises per workout (sets, reps, weight, cardio)
- [x] Workout history list with expandable detail view

### Phase 3 — Goal Tracking ✅
- [x] Goal creation (type, target, unit, deadline)
- [x] Progress update UI with progress bar
- [x] Active vs. completed goals view
- [x] Streak + weekly activity heatmap on dashboard

### Phase 4 — Food Photo Tracking ✅
- [x] Drag-and-drop / click photo upload
- [x] Claude vision analysis → item list + macro breakdown
- [x] Confirm/retake flow before saving
- [x] Daily food log with totals (calories, protein, carbs, fat)
- [x] DailyCalorie summary auto-updated on each log

### Phase 5 — Polish & Deploy (Next)
- [ ] Mobile responsive audit and fixes
- [ ] Error states, loading skeletons, empty states
- [ ] Calorie budget configuration per user
- [ ] Deploy API to Railway, frontend to Vercel/Netlify
- [ ] Swap local file storage for Cloudflare R2 or S3

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| POST | /api/auth/logout | Sign out |
| GET | /api/auth/me | Current session user |
| GET | /api/workouts | List workouts (paginated) |
| POST | /api/workouts | Create workout + exercises |
| PUT | /api/workouts/:id | Update workout |
| DELETE | /api/workouts/:id | Delete workout |
| GET | /api/goals | List goals |
| POST | /api/goals | Create goal |
| PATCH | /api/goals/:id/progress | Update current value |
| DELETE | /api/goals/:id | Delete goal |
| GET | /api/food | List food logs (filterable by date) |
| POST | /api/food/analyze | Upload photo → AI analysis |
| POST | /api/food | Save confirmed food log |
| DELETE | /api/food/:id | Delete food log |
| GET | /api/dashboard/summary | Dashboard stats |
