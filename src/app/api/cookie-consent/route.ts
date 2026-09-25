import { NextResponse } from "next/server";
import {
  COOKIE_CONSENT_NOTICE_KEY,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentChoice,
} from "@/lib/cookie-consent";

export const runtime = "edge";

function isValidChoice(value: string | null): value is CookieConsentChoice {
  return value === "accepted" || value === "rejected";
}

function getReturnUrl(request: Request): URL {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const referer = request.headers.get("referer");

  if (referer) {
    try {
      return new URL(referer);
    } catch {
      // Fall through to site URL.
    }
  }

  return new URL(siteUrl);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawChoice = formData.get("choice");
  const choice = typeof rawChoice === "string" ? rawChoice : null;

  if (!isValidChoice(choice)) {
    return NextResponse.redirect(getReturnUrl(request), 303);
  }

  const redirectUrl = getReturnUrl(request);

  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set(COOKIE_CONSENT_STORAGE_KEY, choice, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  response.cookies.set(COOKIE_CONSENT_NOTICE_KEY, choice, {
    path: "/",
    sameSite: "lax",
    maxAge: 60,
  });

  return response;
}
