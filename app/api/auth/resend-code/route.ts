import { requireAuth } from "@/lib/auth";
import { resendVerification } from "@/lib/verification";
import { prisma } from "@/lib/prisma";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new ApiError("USER_NOT_FOUND", "Usuario no encontrado", 404);
    }
    if (user.emailVerified) {
      throw new ApiError("ALREADY_VERIFIED", "El correo ya está verificado", 400);
    }

    await resendVerification(userId, user.email);

    return ok({ sent: true });
  } catch (error) {
    return errorResponse(error);
  }
}