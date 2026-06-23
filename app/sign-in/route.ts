import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

const hasWorkOSConfig = Boolean(
  process.env.WORKOS_CLIENT_ID &&
    process.env.WORKOS_API_KEY &&
    process.env.WORKOS_COOKIE_PASSWORD &&
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
);

export async function GET() {
  if (!hasWorkOSConfig) {
    return new Response("WorkOS sign-in is not configured.", { status: 200 });
  }

  redirect(await getSignInUrl());
}
