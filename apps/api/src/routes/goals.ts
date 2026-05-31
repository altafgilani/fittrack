import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const goalSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["weight", "strength", "cardio", "body_measurement", "habit"]),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  unit: z.string().min(1),
  deadline: z.string().optional(),
});

router.get("/", async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(goals);
});

router.post("/", async (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { deadline, ...rest } = parsed.data;
  const goal = await prisma.goal.create({
    data: {
      ...rest,
      userId: req.user!.id,
      deadline: deadline ? new Date(deadline) : undefined,
    },
  });

  res.status(201).json(goal);
});

router.patch("/:id/progress", async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const { currentValue } = z.object({ currentValue: z.number() }).parse(req.body);
  const completed = currentValue >= existing.targetValue;

  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      currentValue,
      completed,
      completedAt: completed && !existing.completed ? new Date() : existing.completedAt,
    },
  });

  res.json(goal);
});

router.put("/:id", async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { deadline, ...rest } = parsed.data;
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { ...rest, deadline: deadline ? new Date(deadline) : null },
  });

  res.json(goal);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
