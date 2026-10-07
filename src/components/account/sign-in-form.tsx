"use client";

import { useActionState, useState } from "react";
import { requestSignIn, type SignInRequestState } from "@/app/account/actions";

/** Email field that requests a sign-in link, then shows "check your email". */
export function SignInForm() {
  // Remounting the form (new key) clears its state for "use a different email".
  const [attempt, setAttempt] = useState(0);
  return <Form key={attempt} onReset={() => setAttempt((n) => n + 1)} />;
}

function Form({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState<
    SignInRequestState,
    FormData
  >(requestSignIn, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="space-y-4">
        <h2 className="text-h3">Check your email</h2>
        <p className="text-ink-muted">
          We&rsquo;ve sent a sign-in link to{" "}
          <span className="text-ink">{state.email}</span>. It works once and
          expires in 15 minutes.
        </p>
        <button type="button" className="link text-sm" onClick={onReset}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Email address</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={
            state.status === "error" ? "sign-in-error" : undefined
          }
          className="block min-h-12 w-full rounded-sm border bg-surface px-4 text-base focus-visible:border-ink"
        />
      </label>
      {state.status === "error" && (
        <p id="sign-in-error" role="alert" className="text-sm">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
