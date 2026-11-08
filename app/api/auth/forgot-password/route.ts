import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "@/lib/password-reset";
import { ok, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = forgotPasswordSchema.parse(await request.json());

    // Siempre responde sent: true, incluso si el correo no existe,
    // para no revelar si está registrado.
    await requestPasswordReset(body.email);

    return ok({ sent: true });
  } catch (error) {
    return errorResponse(error);
  }
}
