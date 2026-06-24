import { ArrowRightIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams: Promise<{
    config?: string;
    redirectUrl?: string;
  }>;
};

function getSafeRedirectUrl(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function hasWorkOSConfig() {
  return Boolean(
    process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_API_KEY &&
      process.env.WORKOS_COOKIE_PASSWORD &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}

function AuthCardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-28 rounded-md bg-muted" />
        <div className="h-5 w-full rounded-md bg-muted" />
        <div className="h-5 w-4/5 rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full rounded-lg bg-muted" />
      <div className="h-10 w-full rounded-lg bg-muted" />
    </div>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const { config, redirectUrl } = await searchParams;
  const returnTo = getSafeRedirectUrl(redirectUrl);
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?redirectUrl=${encodeURIComponent(returnTo)}`;
  const isConfigured = hasWorkOSConfig();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl text-foreground">ログイン</h1>
        <p className="text-muted-foreground text-sm leading-6">
          チャットを利用するにはログインが必要です。WorkOS AuthKit
          で認証してから続行してください。
        </p>
      </div>

      {(!isConfigured || config === "missing") && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-muted-foreground text-sm leading-6">
          ローカルで WorkOS ログインを使うには <code>WORKOS_CLIENT_ID</code>、
          <code>WORKOS_API_KEY</code>、<code>WORKOS_COOKIE_PASSWORD</code>、
          <code>NEXT_PUBLIC_WORKOS_REDIRECT_URI</code> を設定してください。
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isConfigured ? (
          <Button asChild className="w-full justify-between" size="lg">
            <Link href={signInHref}>
              <span className="inline-flex items-center gap-2">
                <KeyRoundIcon className="size-4" />
                WorkOS でログイン
              </span>
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button className="w-full justify-between" disabled size="lg">
            <span className="inline-flex items-center gap-2">
              <KeyRoundIcon className="size-4" />
              WorkOS でログイン
            </span>
            <ArrowRightIcon className="size-4" />
          </Button>
        )}

        <Button asChild className="w-full" size="lg" variant="outline">
          <Link href={registerHref}>会員登録はこちら</Link>
        </Button>
      </div>
    </div>
  );
}

export default function Page(props: LoginPageProps) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginContent {...props} />
    </Suspense>
  );
}
