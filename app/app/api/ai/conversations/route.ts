import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

// GET /api/ai/conversations
// Lista las conversaciones del usuario, la más reciente primero,
// con una vista previa del último mensaje.
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const rows = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, role: true },
        },
      },
    });

    const conversations = rows.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastMessage: c.messages[0]?.text ?? "",
    }));

    return ok({ conversations });
  } catch (error) {
    return errorResponse(error);
  }
}
