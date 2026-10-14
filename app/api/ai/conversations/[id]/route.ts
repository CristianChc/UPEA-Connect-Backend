import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

// GET /api/ai/conversations/:id
// Devuelve la conversación con todos sus mensajes en orden cronológico.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;

    const conversation = await prisma.chatConversation.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            text: true,
            action: true,
            actionStatus: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new ApiError("NOT_FOUND", "Conversación no encontrada", 404);
    }

    return ok(conversation);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/ai/conversations/:id
// Borra la conversación y sus mensajes (cascade).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;

    const result = await prisma.chatConversation.deleteMany({ where: { id, userId } });

    if (result.count === 0) {
      throw new ApiError("NOT_FOUND", "Conversación no encontrada", 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
