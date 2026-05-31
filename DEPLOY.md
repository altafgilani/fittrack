# Deploying FitTrack to Render

FitTrack deploys as a **single web service** (Express serves both the API and the
built React app) plus a **PostgreSQL database**. The included `render.yaml`
blueprint provisions both automatically.

## One-time deploy

1. Go to <https://dashboard.render.com> and sign in with GitHub.
2. Click **New → Blueprint**.
3. Select the **`altafgilani/fittrack`** repository.
4. Render reads `render.yaml` and shows: a web service `fittrack` + a Postgres
   database `fittrack-db`. Click **Apply**.
5. When prompted, set the one secret it can't generate:
   - **`ANTHROPIC_API_KEY`** → your key from <https://console.anthropic.com>
     (you can leave it blank if you don't need food-photo analysis).
6. Wait for the first build/deploy (~3–5 min). Your app will be live at:
   ```
   https://fittrack.onrender.com
   ```
   (Render may add a random suffix; the exact URL is shown in the dashboard.)

Share that URL with anyone — accounts and data persist in Postgres.

## How it works

- `buildCommand`: installs deps (incl. dev), builds the web app, then the API.
- `startCommand`: runs `prisma db push` (syncs tables) then starts Express.
- Express serves `/api/*` from the backend and everything else from
  `apps/web/dist`, so it's one origin and same-site cookies just work.
- `DATABASE_URL` and `SESSION_SECRET` are injected by Render automatically.

## Free-tier notes

- The service **sleeps after 15 minutes** of no traffic and takes ~30s to wake
  on the next request — the first load after idle will be slow.
- The free Postgres instance **expires after 30 days**; upgrade the database
  plan in Render to keep data beyond that.
- Uploaded food photos are stored on the instance's ephemeral disk, so old image
  thumbnails may disappear after a redeploy. Calorie/macro data is in Postgres
  and is **not** affected.

## Redeploying

Every push to `master` triggers an automatic redeploy.
