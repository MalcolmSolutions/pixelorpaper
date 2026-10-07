import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/account/sign-in-form";
import { getCurrentCustomer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default async function SignInPage(props: PageProps<"/account/sign-in">) {
  if (await getCurrentCustomer()) redirect("/account");
  const { error } = await props.searchParams;

  return (
    <div className="container-page section">
      <div className="mx-auto max-w-md space-y-8">
        <header className="space-y-4">
          <p className="eyebrow">Your account</p>
          <h1>Sign in</h1>
          <p className="text-ink-muted">
            Enter the email you use at checkout and we&rsquo;ll send you a link
            to see your orders. No password needed.
          </p>
        </header>

        {error === "link" && (
          <div role="alert" className="border-l-2 border-ink py-1 pl-4 text-sm">
            <p className="font-medium">That sign-in link didn&rsquo;t work</p>
            <p className="text-ink-muted">
              Links work once and expire after 15 minutes. Request a new one
              below.
            </p>
          </div>
        )}

        <SignInForm />
      </div>
    </div>
  );
}
