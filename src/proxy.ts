import { NextResponse, type NextRequest } from "next/server";

const sessionCookieNames = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);

  const isLoginPage =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const hasSessionCookie = sessionCookieNames.some((cookieName) =>
    request.cookies.has(cookieName),
  );

  if (!isLoginPage && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
