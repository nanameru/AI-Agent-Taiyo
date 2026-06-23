import type { AuthConfig } from "convex/server";

const clientId =
  process.env.WORKOS_CLIENT_ID ?? "client_local_workos_placeholder";

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      algorithm: "RS256",
      applicationID: clientId,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
