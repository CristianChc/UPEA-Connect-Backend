import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createNoteSchema, listNotesQuerySchema } from "@/lib/validation";
import { errorResponse, ok } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const { search, courseName, page, limit } = listNotesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const where = {
      userId,
      ...(courseName ? { courseName } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { content: { contains: search, mode: "insensitive" as const } },
              { courseName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [notes, total] = await prisma.$transaction([
      prisma.note.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          courseName: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    return ok({ notes, total, page, limit });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = createNoteSchema.parse(await request.json());

    const note = await prisma.note.create({
      data: {
        title: body.title,
        content: body.content,
        courseName: body.courseName,
        userId,
        pages: {
          create: body.pages.map((page) => ({
            pageIndex: page.pageIndex,
            textContent: page.textContent,
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
          })),
        },
      },
      include: {
        pages: {
          orderBy: { pageIndex: "asc" },
          include: { floatingElements: true },
        },
      },
    });

    return ok(note, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
