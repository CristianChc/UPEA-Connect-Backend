import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPassword } from "@/lib/password-reset";
import { ok, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await request.json());

    await resetPassword(body.email, body.code, body.newPassword);

    return ok({ reset: true });
  } catch (error) {
    return errorResponse(error);
  }
}
