import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const exerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["strength", "cardio", "flexibility"]),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  distanceKm: z.number().positive().optional(),
  durationSecs: z.number().int().positive().optional(),
  orderIndex: z.number().int().default(0),
});

const workoutSchema = z.object({
  name: z.string().min(1),
  date: z.string().optional(),
  durationMins: z.number().int().positive().optional(),
  notes: z.string().optional(),
  effort: z.number().int().min(1).max(10).optional(),
  exercises: z.array(exerciseSchema).default([]),
});

router.get("/", async (req, res) => {
  const userId = req.user!.id;
  const { limit = "20", offset = "0" } = req.query as Record<string, string>;

  const [workouts, total] = await Promise.all([
    prisma.workout.findMany({
      where: { userId },
      include: { exercises: { orderBy: { orderIndex: "asc" } } },
      orderBy: { date: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    }),
    prisma.workout.count({ where: { userId } }),
  ]);

  res.json({ workouts, total });
});

router.get("/:id", async (req, res) => {
  const workout = await prisma.workout.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }
  res.json(workout);
});

router.post("/", async (req, res) => {
  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { exercises, date, ...rest } = parsed.data;
  const workout = await prisma.workout.create({
    data: {
      ...rest,
      userId: req.user!.id,
      date: date ? new Date(date) : new Date(),
      exercises: {
        create: exercises,
      },
    },
    include: { exercises: true },
  });

  res.status(201).json(workout);
});

router.put("/:id", async (req, res) => {
  const existing = await prisma.workout.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { exercises, date, ...rest } = parsed.data;

  await prisma.exercise.deleteMany({ where: { workoutId: req.params.id } });

  const workout = await prisma.workout.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      date: date ? new Date(date) : existing.date,
      exercises: { create: exercises },
    },
    include: { exercises: true },
  });

  res.json(workout);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.workout.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  await prisma.workout.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
