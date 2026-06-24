import { ArrowRightIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

type RegisterPageProps = {
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
        <div className="h-8 w-32 rounded-md bg-muted" />
        <div className="h-5 w-full rounded-md bg-muted" />
        <div className="h-5 w-4/5 rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full rounded-lg bg-muted" />
      <div className="h-10 w-full rounded-lg bg-muted" />
    </div>
  );
}

async function RegisterContent({ searchParams }: RegisterPageProps) {
  const { config, redirectUrl } = await searchParams;
  const returnTo = getSafeRedirectUrl(redirectUrl);
  const signUpHref = `/sign-up?returnTo=${encodeURIComponent(returnTo)}`;
  const loginHref = `/login?redirectUrl=${encodeURIComponent(returnTo)}`;
  const isConfigured = hasWorkOSConfig();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl text-foreground">会員登録</h1>
        <p className="text-muted-foreground text-sm leading-6">
          アカウントを作成するとチャットを利用できます。WorkOS AuthKit
          の登録フローから開始してください。
        </p>
      </div>

      {(!isConfigured || config === "missing") && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-muted-foreground text-sm leading-6">
          ローカルで WorkOS 会員登録を使うには <code>WORKOS_CLIENT_ID</code>、
          <code>WORKOS_API_KEY</code>、<code>WORKOS_COOKIE_PASSWORD</code>、
          <code>NEXT_PUBLIC_WORKOS_REDIRECT_URI</code> を設定してください。
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isConfigured ? (
          <Button asChild className="w-full justify-between" size="lg">
            <a href={signUpHref}>
              <span className="inline-flex items-center gap-2">
                <UserPlusIcon className="size-4" />
                WorkOS で会員登録
              </span>
              <ArrowRightIcon className="size-4" />
            </a>
          </Button>
        ) : (
          <Button className="w-full justify-between" disabled size="lg">
            <span className="inline-flex items-center gap-2">
              <UserPlusIcon className="size-4" />
              WorkOS で会員登録
            </span>
            <ArrowRightIcon className="size-4" />
          </Button>
        )}

        <Button asChild className="w-full" size="lg" variant="outline">
          <Link href={loginHref}>ログインはこちら</Link>
        </Button>
      </div>
    </div>
  );
}

export default function Page(props: RegisterPageProps) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <RegisterContent {...props} />
    </Suspense>
  );
}
