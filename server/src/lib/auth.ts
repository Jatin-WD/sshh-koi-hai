import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

export const ACCESS_COOKIE = "sshh_access";
export const REFRESH_COOKIE = "sshh_refresh";

type SafeUser = Omit<User, "passwordHash" | "dateOfBirth"> & { dateOfBirth?: never };

export function publicUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, dateOfBirth: _dateOfBirth, ...safeUser } = user;
  return safeUser;
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function setAuthCookies(res: Response, user: User) {
  const accessToken = jwt.sign({ sub: user.id, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as NonNullable<jwt.SignOptions["expiresIn"]>,
  });
  const refreshToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);

  await prisma.authToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), type: "REFRESH_SESSION", expiresAt },
  });

  const options = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  res.cookie(ACCESS_COOKIE, accessToken, options);
  res.cookie(REFRESH_COOKIE, refreshToken, { ...options, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000 });
}

export function clearAuthCookies(res: Response) {
  const options = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
