import { NextRequest, NextResponse } from "next/server";
import { decodeSession, COOKIE_NAME } from "@/lib/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/pos",
  "/inventory",
  "/menu",
  "/orders",
  "/purchase-orders",
  "/expenses",
  "/payroll",
  "/reports",
];
const MANAGER_ONLY_PREFIXES = [
  "/dashboard",
  "/menu",
  "/purchase-orders",
  "/expenses",
  "/payroll",
  "/reports",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const raw = request.cookies.get(COOKIE_NAME)?.value;
  const session = raw ? decodeSession(raw) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const managerOnly = MANAGER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (managerOnly && session.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/inventory/:path*",
    "/menu/:path*",
    "/orders/:path*",
    "/purchase-orders/:path*",
    "/expenses/:path*",
    "/payroll/:path*",
    "/reports/:path*",
  ],
};
