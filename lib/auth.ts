import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-response";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  return compare(password, hashValue);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function requireAuth(request: NextRequest): Promise<string> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError("UNAUTHORIZED", "Token de autenticación requerido", 401);
  }

  const token = header.slice(7);

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = typeof payload.userId === "string" ? payload.userId : payload.sub;
    if (!userId) {
      throw new Error("missing userId");
    }
    return userId;
  } catch {
    throw new ApiError("UNAUTHORIZED", "Token inválido o expirado", 401);
  }
}
