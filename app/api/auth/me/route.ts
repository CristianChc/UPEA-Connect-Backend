import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        carrera: true,
        semestre: true,
        fotoUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError("NOT_FOUND", "Usuario no encontrado", 404);
    }

    return ok(user);
  } catch (error) {
    return errorResponse(error);
  }
}
