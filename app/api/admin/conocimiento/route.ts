import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api-response";
import {
  crearConocimientoSchema,
  listarConocimientoQuerySchema,
} from "@/lib/validation";

function adminAutorizado(request: NextRequest): boolean {
  const claveConfigurada = process.env.ADMIN_API_KEY;
  if (!claveConfigurada) return false;

  const claveEnviada = request.headers.get("x-admin-key") ?? "";
  if (claveEnviada.length === 0 || claveConfigurada.length === 0) return false;

  // Comparación segura contra ataques de temporización (timing-safe).
  const a = Buffer.from(claveConfigurada, "utf8");
  const b = Buffer.from(claveEnviada, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!adminAutorizado(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Clave de administrador requerida", statusCode: 401 },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const { categoria, activo, page, limit } =
      listarConocimientoQuerySchema.parse(query);

    const where: Record<string, unknown> = {};
    if (categoria) where.categoria = categoria;
    if (activo !== undefined) where.activo = activo;

    const [docs, total] = await Promise.all([
      prisma.conocimiento.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          titulo: true,
          categoria: true,
          contenido: true,
          activo: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.conocimiento.count({ where }),
    ]);

    return ok({ conocimientos: docs, total, page, limit });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!adminAutorizado(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Clave de administrador requerida", statusCode: 401 },
      { status: 401 },
    );
  }

  try {
    const body = crearConocimientoSchema.parse(await request.json());

    const doc = await prisma.conocimiento.create({
      data: {
        titulo: body.titulo,
        categoria: body.categoria,
        contenido: body.contenido,
        activo: body.activo,
        version: body.version,
      },
      select: {
        id: true,
        titulo: true,
        categoria: true,
        contenido: true,
        activo: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok(doc, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
