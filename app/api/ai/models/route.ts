import { requireAuth } from "@/lib/auth";
import { getAiModels } from "@/lib/ai-models";
import { errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

// GET /api/ai/models
// Lista de modelos que el usuario puede elegir en el chat.
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    return ok({ models: getAiModels() });
  } catch (error) {
    return errorResponse(error);
  }
}
