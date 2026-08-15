import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { completeEventSchema } from "@/lib/validation";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

const eventSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  type: true,
  isCompleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;
    const body = completeEventSchema.parse(await request.json());

    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Evento no encontrado", 404);
    }

    const event = await prisma.event.update({
      where: { id },
      data: { isCompleted: body.isCompleted },
      select: eventSelect,
    });

    return ok(event);
  } catch (error) {
    return errorResponse(error);
  }
}
