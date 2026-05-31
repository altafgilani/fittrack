import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.session?.sessionId as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: sessionId } });
    res.status(401).json({ error: "Session expired" });
    return;
  }

  req.user = session.user;
  next();
}

declare module "express-session" {
  interface SessionData {
    sessionId: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: import("@prisma/client").User;
    }
  }
}
