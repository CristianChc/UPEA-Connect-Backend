import { prisma } from "@/lib/prisma";
import { signToken, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.password))) {
      throw new ApiError("INVALID_CREDENTIALS", "Email o contraseña incorrectos", 401);
    }

    const token = await signToken(user.id);
    const safeUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      carrera: user.carrera,
      semestre: user.semestre,
      fotoUrl: user.fotoUrl,
    };

    return ok({ token, user: safeUser });
  } catch (error) {
    return errorResponse(error);
  }
}
