import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { ACCESS_COOKIE, publicUser } from "../lib/auth.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/appError.js";

declare global { namespace Express { interface Request { authUser?: ReturnType<typeof publicUser>; } } }

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || payload.type !== "access") throw new AppError("Invalid session", 401, "INVALID_SESSION");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "SUSPENDED" || user.status === "BANNED" || user.status === "DELETED") throw new AppError("Account unavailable", 401, "ACCOUNT_UNAVAILABLE");
    req.authUser = publicUser(user);
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError("Invalid or expired session", 401, "INVALID_SESSION")); }
}
