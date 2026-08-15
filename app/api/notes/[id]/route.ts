import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createNoteSchema } from "@/lib/validation";
import { ApiError, errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        pages: {
          orderBy: { pageIndex: "asc" },
          include: { floatingElements: true },
        },
      },
    });

    if (!note) {
      throw new ApiError("NOT_FOUND", "Apunte no encontrado", 404);
    }

    return ok(note);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;
    const body = createNoteSchema.parse(await request.json());

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Apunte no encontrado", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.note.update({
        where: { id },
        data: { title: body.title, content: body.content, courseName: body.courseName },
      });

      await tx.notePage.deleteMany({ where: { noteId: id } });

      for (const page of body.pages) {
        await tx.notePage.create({
          data: {
            pageIndex: page.pageIndex,
            textContent: page.textContent,
            noteId: id,
            floatingElements: {
              create: page.floatingElements.map((el) => ({
                type: el.type,
                positionX: el.positionX,
                positionY: el.positionY,
                width: el.width,
                height: el.height,
                text: el.text,
                imageUrl: el.imageUrl,
              })),
            },
          },
        });
      }
    });

    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        pages: {
          orderBy: { pageIndex: "asc" },
          include: { floatingElements: true },
        },
      },
    });

    return ok(note);
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

    const result = await prisma.note.deleteMany({ where: { id, userId } });

    if (result.count === 0) {
      throw new ApiError("NOT_FOUND", "Apunte no encontrado", 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
