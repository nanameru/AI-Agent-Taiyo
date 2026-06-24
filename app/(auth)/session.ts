import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOrCreateUserByEmail } from "@/lib/db/queries";
import { auth, type UserType } from "./auth";

export type AppSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    type: UserType;
  };
  expires: string;
} | null;

function hasWorkOSConfig() {
  return Boolean(
    process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_API_KEY &&
      process.env.WORKOS_COOKIE_PASSWORD &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}

function getWorkOSDisplayName(user: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return name || user.email || null;
}

export async function getAppSession(): Promise<AppSession> {
  const nextAuthSession = await auth();

  if (nextAuthSession?.user) {
    return nextAuthSession;
  }

  if (!hasWorkOSConfig()) {
    return null;
  }

  try {
    const workosSession = await withAuth();
    const workosUser = workosSession.user;

    if (!workosUser?.email) {
      return null;
    }

    const localUser = await getOrCreateUserByEmail({
      email: workosUser.email,
    });

    return {
      user: {
        id: localUser.id,
        email: localUser.email,
        name: getWorkOSDisplayName(workosUser),
        image: workosUser.profilePictureUrl,
        type: "regular",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
