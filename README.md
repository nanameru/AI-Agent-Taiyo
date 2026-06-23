<a href="https://chatbot.ai-sdk.dev/demo">
  <img alt="Chatbot" src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chatbot</h1>
</a>

<p align="center">
    Chatbot (formerly AI Chatbot) is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chatbot.ai-sdk.dev/docs"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI, Anthropic, Google, xAI, and other model providers via AI Gateway
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. Models are configured in `lib/ai/models.ts` with per-model provider routing. Included models: Mistral, Moonshot, DeepSeek, OpenAI, and xAI.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/chatbot)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Convex and WorkOS AuthKit

This fork adds a Convex backend and WorkOS AuthKit routes for Google sign-in.

Run the Convex dev setup once to create the local Convex deployment, generate
types, and write Convex URLs to `.env.local`:

```bash
CONVEX_AGENT_MODE=anonymous pnpm exec convex dev --once
```

Configure WorkOS for local development:

1. In the WorkOS dashboard, enable Google as a social auth provider.
2. Add `http://localhost:3000/callback` as an allowed redirect URI.
3. Set the app logout URI to `http://localhost:3000`.
4. Add the WorkOS values to `.env.local`:

```bash
WORKOS_CLIENT_ID="client_..."
WORKOS_API_KEY="sk_test_..."
WORKOS_COOKIE_PASSWORD="$(openssl rand -base64 24)"
NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/callback"
```

Set the same WorkOS values on the Convex deployment:

```bash
pnpm exec convex env set WORKOS_CLIENT_ID "$WORKOS_CLIENT_ID"
pnpm exec convex env set WORKOS_API_KEY "$WORKOS_API_KEY"
```

Then sync Convex again:

```bash
pnpm exec convex dev --once
```

The WorkOS callback is mounted at `/callback`, sign-in at `/sign-in`, and
sign-up at `/sign-up`.
