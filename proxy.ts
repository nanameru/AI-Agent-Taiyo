import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPlaywright = process.env.PLAYWRIGHT === "True";
  const hasWorkOSConfig = Boolean(
    process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_API_KEY &&
      process.env.WORKOS_COOKIE_PASSWORD &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
  const workos = hasWorkOSConfig
    ? await authkit(request, {
        redirectUri: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
      })
    : null;

  const next = () =>
    workos
      ? handleAuthkitHeaders(request, workos.headers)
      : NextResponse.next();

  const redirect = (url: string | URL) => {
    if (workos) {
      return handleAuthkitHeaders(request, workos.headers, {
        redirect: url.toString(),
      });
    }

    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (isPlaywright && ["/login", "/register"].includes(pathname)) {
    return next();
  }

  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/callback" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up"
  ) {
    return next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!token) {
    const redirectUrl = encodeURIComponent(new URL(request.url).pathname);

    return redirect(
      new URL(`${base}/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return redirect(new URL(`${base}/`, request.url));
  }

  return next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",
    "/callback",
    "/sign-in",
    "/sign-up",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
