import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createEventSchema, listEventsQuerySchema } from "@/lib/validation";
import { errorResponse, ok } from "@/lib/api-response";
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

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const query = listEventsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const where = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.start || query.end
        ? {
            date: {
              ...(query.start ? { gte: query.start } : {}),
              ...(query.end ? { lte: query.end } : {}),
            },
          }
        : {}),
    };

    const [events, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        select: eventSelect,
        orderBy: { date: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.event.count({ where }),
    ]);

    return ok({ events, total, page: query.page, limit: query.limit });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = createEventSchema.parse(await request.json());

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        date: body.date,
        endTime: body.endTime,
        category: body.category,
        color: body.color,
        type: body.type,
        userId,
      },
      select: eventSelect,
    });

    return ok(event, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
