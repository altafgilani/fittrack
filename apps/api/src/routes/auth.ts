import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt },
  });

  req.session.sessionId = session.id;
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, onboarded: false },
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt },
  });

  req.session.sessionId = session.id;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboarded: user.onboardedAt !== null,
    },
  });
});

router.post("/logout", async (req, res) => {
  const sessionId = req.session?.sessionId;
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const sessionId = req.session?.sessionId;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const { user } = session;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboarded: user.onboardedAt !== null,
    },
  });
});

router.post("/complete-onboarding", async (req, res) => {
  const sessionId = req.session?.sessionId;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { onboardedAt: new Date() },
  });

  res.json({ ok: true });
});

export default router;
