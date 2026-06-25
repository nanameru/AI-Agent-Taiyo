import { type NextRequest, NextResponse } from "next/server";

const KNOWN_AUTH_COOKIES = [
  "wos-session",
  "workos-access-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
];

function shouldDeleteCookie(name: string) {
  return (
    KNOWN_AUTH_COOKIES.includes(name) || name.startsWith("wos-auth-verifier")
  );
}

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login?reset=1", request.url)
  );

  for (const cookie of request.cookies.getAll()) {
    if (shouldDeleteCookie(cookie.name)) {
      response.cookies.delete(cookie.name);
    }
  }

  for (const cookieName of KNOWN_AUTH_COOKIES) {
    response.cookies.delete(cookieName);
  }

  return response;
}
