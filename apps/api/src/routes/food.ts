import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.get("/", async (req, res) => {
  const { date } = req.query as { date?: string };
  const userId = req.user!.id;

  const where: Record<string, unknown> = { userId };
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const logs = await prisma.foodLog.findMany({
    where,
    orderBy: { date: "desc" },
  });

  res.json(logs);
});

router.post("/analyze", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No photo uploaded" });
    return;
  }

  const filePath = req.file.path;

  try {
    const imageData = fs.readFileSync(filePath);
    const base64Image = imageData.toString("base64");
    const mediaType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image },
            },
            {
              type: "text",
              text: `Analyze this food image and identify all food items visible. For each item, estimate the portion size and nutritional content.

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "name": "food item name",
      "portionDescription": "e.g. 1 cup, 200g, 1 medium",
      "grams": 200,
      "calories": 250,
      "protein": 15.5,
      "carbs": 30.2,
      "fat": 8.1
    }
  ],
  "total": {
    "calories": 250,
    "protein": 15.5,
    "carbs": 30.2,
    "fat": 8.1
  },
  "confidence": "high|medium|low",
  "notes": "any relevant notes about the analysis"
}`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "Unexpected AI response" });
      return;
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Could not parse AI response" });
      return;
    }

    const analysis = JSON.parse(jsonMatch[0]);

    const photoUrl = `/uploads/${req.file.filename}`;
    res.json({ photoUrl, analysis });
  } catch (err) {
    console.error("Food analysis error:", err);
    res.status(500).json({ error: "Failed to analyze food image" });
  }
});

const foodLogSchema = z.object({
  date: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  photoUrl: z.string().optional(),
  aiResult: z.string().optional(),
  confirmedCalories: z.number().int(),
  confirmedProtein: z.number().default(0),
  confirmedCarbs: z.number().default(0),
  confirmedFat: z.number().default(0),
  notes: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = foodLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { date, ...rest } = parsed.data;
  const logDate = date ? new Date(date) : new Date();

  const foodLog = await prisma.foodLog.create({
    data: { ...rest, userId: req.user!.id, date: logDate },
  });

  // Update daily calorie summary
  const dayStart = new Date(logDate);
  dayStart.setHours(0, 0, 0, 0);

  const dailyLogs = await prisma.foodLog.findMany({
    where: {
      userId: req.user!.id,
      date: { gte: dayStart, lte: new Date(dayStart.getTime() + 86400000 - 1) },
    },
  });

  const totalConsumed = dailyLogs.reduce((sum, l) => sum + l.confirmedCalories, 0);

  await prisma.dailyCalorie.upsert({
    where: { userId_date: { userId: req.user!.id, date: dayStart } },
    create: { userId: req.user!.id, date: dayStart, caloriesConsumed: totalConsumed },
    update: { caloriesConsumed: totalConsumed },
  });

  res.status(201).json(foodLog);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.foodLog.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Food log not found" });
    return;
  }

  await prisma.foodLog.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
