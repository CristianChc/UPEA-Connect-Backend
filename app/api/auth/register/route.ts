import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

const userSelect = {
  id: true,
  nombre: true,
  email: true,
  carrera: true,
  semestre: true,
  fotoUrl: true,
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new ApiError("EMAIL_ALREADY_REGISTERED", "El email ya está registrado", 409);
    }

    const user = await prisma.user.create({
      data: {
        nombre: body.nombre,
        email: body.email,
        password: await hashPassword(body.password),
        carrera: body.carrera,
        semestre: body.semestre,
      },
      select: userSelect,
    });

    const token = await signToken(user.id);

    return ok({ token, user }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
