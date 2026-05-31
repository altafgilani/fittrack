import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const userId = req.user!.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today.getTime() + 86400000 - 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const [todayCalories, recentWorkouts, activeGoals, weeklyWorkouts] =
    await Promise.all([
      prisma.dailyCalorie.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      prisma.workout.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { exercises: true },
      }),
      prisma.goal.findMany({
        where: { userId, completed: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.workout.findMany({
        where: { userId, date: { gte: weekAgo, lte: todayEnd } },
        select: { date: true },
      }),
    ]);

  // Build streak
  const workoutDays = new Set(
    weeklyWorkouts.map((w) => w.date.toISOString().split("T")[0])
  );

  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (workoutDays.has(d.toISOString().split("T")[0])) {
      streak++;
    } else {
      break;
    }
  }

  res.json({
    todayCalories: todayCalories ?? { caloriesConsumed: 0, caloriesBurned: 0, calorieBudget: 2000 },
    recentWorkouts,
    activeGoals,
    weeklyActivity: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split("T")[0],
        hasWorkout: workoutDays.has(d.toISOString().split("T")[0]),
      };
    }),
    streak,
  });
});

export default router;
