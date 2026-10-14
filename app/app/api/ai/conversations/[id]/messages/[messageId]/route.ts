import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateChatActionSchema } from "@/lib/validation";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

// PATCH /api/ai/conversations/:id/messages/:messageId
// Marca la tarjeta de acción de un mensaje como DONE (creada) o DISCARDED (descartada),
// para que al reabrir la conversación no vuelva a aparecer como pendiente.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id, messageId } = await params;
    const { actionStatus } = updateChatActionSchema.parse(await request.json());

    const result = await prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        conversationId: id,
        conversation: { userId },
        actionStatus: { not: null },
      },
      data: { actionStatus },
    });

    if (result.count === 0) {
      throw new ApiError("NOT_FOUND", "Mensaje con acción no encontrado", 404);
    }

    return ok({ id: messageId, actionStatus });
  } catch (error) {
    return errorResponse(error);
  }
}
