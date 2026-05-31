# FitTrack — Product Requirements Document

## Vision
A web app that lets users log workouts, set fitness goals, track progress, and analyze food intake via photo — all in one place.

---

## User Personas

- **Casual fitness user** — wants simple workout logging and a calorie count without manual entry
- **Goal-driven athlete** — sets structured goals (run 5K in 25 min, lose 10 lbs) and wants progress charts
- **Diet-conscious user** — primarily uses food photo tracking, wants macro breakdowns

---

## Core Features

### 1. Workout Logging
- Log exercises with sets, reps, weight, duration, and distance
- Pre-built exercise library with search; custom exercises supported
- Workout templates (save a routine and reuse it)
- Session notes and perceived effort rating (RPE 1–10)

### 2. Goal Setting & Progress Tracking
- Goal types: weight target, strength milestone (e.g. bench press 200 lbs), cardio PR, body measurement
- Deadline and milestone sub-goals
- Progress dashboard: charts showing trend toward each goal
- Streak tracking (consecutive workout days)

### 3. Food & Calorie Tracking via Photo
- User uploads or snaps a photo of their meal
- AI (Claude vision API) identifies food items and estimates portion sizes
- Returns calorie count and macros (protein, carbs, fat)
- User can confirm/edit before saving
- Daily calorie budget vs. consumed summary

### 4. Dashboard
- Today's summary: calories in, calories burned (estimated from workouts), net
- Active goals with % progress
- Recent workouts
- Weekly activity heatmap

---

## Non-Functional Requirements
- Responsive web (mobile-first; no native app required)
- Photo uploads processed in < 5 seconds
- Data persisted per authenticated user
- Secure auth (no plaintext passwords, session-based)
