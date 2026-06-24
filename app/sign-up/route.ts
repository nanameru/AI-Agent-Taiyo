import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

const hasWorkOSConfig = Boolean(
  process.env.WORKOS_CLIENT_ID &&
    process.env.WORKOS_API_KEY &&
    process.env.WORKOS_COOKIE_PASSWORD &&
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
);

function getSafeReturnTo(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  if (!hasWorkOSConfig) {
    redirect("/register?config=missing");
  }

  const returnTo = getSafeReturnTo(
    request.nextUrl.searchParams.get("returnTo")
  );

  redirect(await getSignUpUrl({ returnTo }));
}
