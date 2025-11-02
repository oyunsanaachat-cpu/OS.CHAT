// middleware.ts — Түр унтраасан хувилбар
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // Ямар ч шалгалт/redirect ХИЙХГҮЙ — шууд нэвтрүүлнэ.
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
