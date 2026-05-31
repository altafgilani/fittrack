import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRouter from "./routes/auth";
import workoutsRouter from "./routes/workouts";
import goalsRouter from "./routes/goals";
import foodRouter from "./routes/food";
import dashboardRouter from "./routes/dashboard";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === "production";

// Render (and most PaaS) terminate TLS at a proxy; trust it so secure cookies work.
if (isProd) app.set("trust proxy", 1);

// In production the frontend is served from the same origin, so CORS is only
// needed for local dev where Vite runs on a different port.
if (!isProd) {
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    })
  );
}

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/food", foodRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production, serve the built React app and let client-side routing handle
// all non-API, non-upload paths.
if (isProd) {
  // Compiled file lives at apps/api/dist/index.js → web build is apps/web/dist.
  const candidates = [
    path.resolve(__dirname, "../../web/dist"),
    path.resolve(process.cwd(), "../web/dist"),
    path.resolve(process.cwd(), "apps/web/dist"),
  ];
  const webDist = candidates.find((p) => fs.existsSync(p));
  if (webDist) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api|uploads).*/, (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  } else {
    console.warn("Web build not found — frontend will not be served.");
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
