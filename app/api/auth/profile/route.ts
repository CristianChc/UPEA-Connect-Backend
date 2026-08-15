import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validation";
import { errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

const userSelect = {
  id: true,
  nombre: true,
  email: true,
  carrera: true,
  semestre: true,
  fotoUrl: true,
  createdAt: true,
} as const;

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = updateProfileSchema.parse(await request.json());

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: userSelect,
    });

    return ok(user);
  } catch (error) {
    return errorResponse(error);
  }
}
