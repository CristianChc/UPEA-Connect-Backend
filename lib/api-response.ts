import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.code, message: error.message, statusCode: error.statusCode },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: first ? `${first.path.join(".") || "request"}: ${first.message}` : "Datos inválidos",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "DUPLICATE_RESOURCE", message: "El recurso ya existe", statusCode: 409 },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Recurso no encontrado", statusCode: 404 },
        { status: 404 },
      );
    }
  }

  console.error(error);
  return NextResponse.json(
    { error: "INTERNAL_SERVER_ERROR", message: "Error interno del servidor", statusCode: 500 },
    { status: 500 },
  );
}
