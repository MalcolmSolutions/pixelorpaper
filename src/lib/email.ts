// Transactional email through Resend's HTTPS API (works in Workers without
// an SDK). Without RESEND_API_KEY, development prints the message to the
// server log instead; production refuses to pretend it sent anything.

const DEFAULT_FROM = "Pixel or Paper <no-reply@pixelorpaper.co.uk>";

export async function sendSignInEmail(to: string, link: string) {
  const subject = "Your Pixel or Paper sign-in link";
  const text = [
    "Use this link to sign in to your Pixel or Paper account:",
    "",
    link,
    "",
    "It works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.",
  ].join("\n");
  const html = `<p>Use this link to sign in to your Pixel or Paper account:</p>
<p><a href="${link}">Sign in to Pixel or Paper</a></p>
<p>It works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set");
    }
    console.info(`[dev email] To: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Resend rejected the email: ${res.status} ${await res.text()}`,
    );
  }
}
