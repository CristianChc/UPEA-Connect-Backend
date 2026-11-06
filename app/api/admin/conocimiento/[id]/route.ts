import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api-response";
import { actualizarConocimientoSchema } from "@/lib/validation";

function adminAutorizado(request: NextRequest): boolean {
  const claveConfigurada = process.env.ADMIN_API_KEY;
  if (!claveConfigurada) return false;

  const claveEnviada = request.headers.get("x-admin-key") ?? "";
  if (claveEnviada.length === 0 || claveConfigurada.length === 0) return false;

  const a = Buffer.from(claveConfigurada, "utf8");
  const b = Buffer.from(claveEnviada, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAutorizado(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Clave de administrador requerida", statusCode: 401 },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;
    const body = actualizarConocimientoSchema.parse(await request.json());

    const doc = await prisma.conocimiento.update({
      where: { id },
      data: {
        ...(body.titulo !== undefined && { titulo: body.titulo }),
        ...(body.categoria !== undefined && { categoria: body.categoria }),
        ...(body.contenido !== undefined && { contenido: body.contenido }),
        ...(body.activo !== undefined && { activo: body.activo }),
        ...(body.version !== undefined && { version: body.version }),
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

    return ok(doc);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAutorizado(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Clave de administrador requerida", statusCode: 401 },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;

    await prisma.conocimiento.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
