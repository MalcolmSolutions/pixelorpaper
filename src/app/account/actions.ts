"use server";

import { redirect } from "next/navigation";
import {
  createSignInToken,
  endSession,
  normaliseEmail,
  redeemSignInToken,
} from "@/lib/auth";
import { sendSignInEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";

export type SignInRequestState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

/**
 * Emails a single-use sign-in link. The reply is the same whether or not an
 * account exists for the address, so it can't be used to discover customers.
 */
export async function requestSignIn(
  _previous: SignInRequestState,
  formData: FormData,
): Promise<SignInRequestState> {
  const email = normaliseEmail(formData.get("email"));
  if (!email) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const token = await createSignInToken(email);
  if (!token) {
    return {
      status: "error",
      message:
        "Too many sign-in links have been requested for this address. Please try again in an hour.",
    };
  }

  try {
    await sendSignInEmail(
      email,
      `${siteUrl()}/account/verify?token=${encodeURIComponent(token)}`,
    );
  } catch (error) {
    console.error("Could not send sign-in email", error);
    return {
      status: "error",
      message: "We couldn't send the email just now. Please try again.",
    };
  }
  return { status: "sent", email };
}

/**
 * Uses the token from a sign-in link. A button on /account/verify submits
 * this, rather than the link itself signing in, because email scanners
 * open links and would use up the single-use token.
 */
export async function completeSignIn(formData: FormData) {
  const ok = await redeemSignInToken(formData.get("token"));
  redirect(ok ? "/account" : "/account/sign-in?error=link");
}

export async function signOut() {
  await endSession();
  redirect("/");
}
