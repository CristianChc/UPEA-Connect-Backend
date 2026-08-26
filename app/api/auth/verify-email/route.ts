import { requireAuth } from "@/lib/auth";
import { verifyCode } from "@/lib/verification";
import { verifyEmailSchema } from "@/lib/validation";
import { errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const { code } = verifyEmailSchema.parse(await request.json());

    await verifyCode(userId, code);

    return ok({ emailVerified: true });
  } catch (error) {
    return errorResponse(error);
  }
}