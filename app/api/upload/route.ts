import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const form = await request.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      throw new ApiError("VALIDATION_ERROR", "No se envió ningún archivo", 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new ApiError("VALIDATION_ERROR", "Tipo de archivo no permitido", 400);
    }

    const blob = await put(`notes/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    });

    return ok({ url: blob.url }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}