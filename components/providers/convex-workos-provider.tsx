"use client";

import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import {
  AuthKitProvider,
  useAccessToken,
  useAuth,
} from "@workos-inc/authkit-nextjs/components";
import { ConvexReactClient, useMutation } from "convex/react";
import { useEffect, useMemo } from "react";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function useWorkOSAuthForConvex() {
  const auth = useAuth();
  const { getAccessToken } = useAccessToken();

  return useMemo(
    () => ({
      isLoading: auth.loading,
      user: auth.user,
      getAccessToken: async () => (await getAccessToken()) ?? null,
    }),
    [auth.loading, auth.user, getAccessToken]
  );
}

function WorkOSUserSync() {
  const { loading, user } = useAuth();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    upsertCurrentUser().catch(() => undefined);
  }, [loading, user, upsertCurrentUser]);

  return null;
}

export function ConvexWorkOSProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthKitProvider>
      {convex ? (
        <ConvexProviderWithAuthKit
          client={convex}
          useAuth={useWorkOSAuthForConvex}
        >
          <WorkOSUserSync />
          {children}
        </ConvexProviderWithAuthKit>
      ) : (
        children
      )}
    </AuthKitProvider>
  );
}
