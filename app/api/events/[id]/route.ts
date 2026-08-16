import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateEventSchema } from "@/lib/validation";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

const eventSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  endTime: true,
  category: true,
  color: true,
  type: true,
  isCompleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function findOwnedEvent(id: string, userId: string) {
  return prisma.event.findFirst({ where: { id, userId } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;
    const body = updateEventSchema.parse(await request.json());

    const existing = await findOwnedEvent(id, userId);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Evento no encontrado", 404);
    }

    const event = await prisma.event.update({
      where: { id },
      data: body,
      select: eventSelect,
    });

    return ok(event);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;

    const result = await prisma.event.deleteMany({ where: { id, userId } });

    if (result.count === 0) {
      throw new ApiError("NOT_FOUND", "Evento no encontrado", 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
