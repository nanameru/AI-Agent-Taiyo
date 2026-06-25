import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isWorkOSRoute =
    pathname === "/callback" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up";
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedPage = pathname === "/" || pathname.startsWith("/chat/");
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

  if (isAuthApiRoute || isWorkOSRoute) {
    return next();
  }

  if (
    isDevelopmentEnvironment &&
    process.env.LOCAL_PREVIEW_AUTH_BYPASS === "1"
  ) {
    return next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const isGuest = guestRegex.test(token?.email ?? "");
  const hasNextAuthSession = Boolean(
    token && (isDevelopmentEnvironment || !isGuest)
  );

  if (workos) {
    if ((workos.session.user || hasNextAuthSession) && isAuthPage) {
      return redirect(new URL(`${base}/`, request.url));
    }

    if (isProtectedPage && !(workos.session.user || hasNextAuthSession)) {
      const redirectUrl = encodeURIComponent(
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );

      return redirect(
        new URL(`${base}/login?redirectUrl=${redirectUrl}`, request.url)
      );
    }

    return next();
  }

  if (isApiRoute) {
    return next();
  }

  if (token && !isGuest && isAuthPage) {
    return redirect(new URL(`${base}/`, request.url));
  }

  if (isProtectedPage && (!token || isGuest)) {
    const redirectUrl = encodeURIComponent(
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );

    return redirect(
      new URL(`${base}/login?redirectUrl=${redirectUrl}`, request.url)
    );
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
