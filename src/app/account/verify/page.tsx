import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeSignIn } from "@/app/account/actions";
import { SubmitButton } from "@/components/cart/submit-button";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
  referrer: "no-referrer",
};

/**
 * Landing page for emailed sign-in links. Opening it doesn't sign in (email
 * scanners open links too); the customer confirms with the button.
 */
export default async function VerifyPage(props: PageProps<"/account/verify">) {
  const { token } = await props.searchParams;
  if (typeof token !== "string" || !token) redirect("/account/sign-in");

  return (
    <div className="container-page section">
      <div className="mx-auto max-w-md space-y-8">
        <header className="space-y-4">
          <p className="eyebrow">Your account</p>
          <h1>Welcome back</h1>
          <p className="text-ink-muted">
            Continue to sign in and see your orders.
          </p>
        </header>
        <form action={completeSignIn}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton
            className="btn btn-primary btn-block"
            pendingLabel="Signing in…"
          >
            Continue to your account
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
