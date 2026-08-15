import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigin = process.env.CORS_ORIGIN ?? "*";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowOrigin = allowedOrigin === "*" ? "*" : origin === allowedOrigin ? origin : allowedOrigin;

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
