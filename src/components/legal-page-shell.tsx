"use client";

import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";

type LegalPageShellProps = {
  title: string;
  intro: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  title,
  intro,
  children,
}: LegalPageShellProps) {
  return (
    <>
      <PageHeader />
      <main className="mx-auto w-full max-w-4xl px-6 pb-8 pt-28 md:px-10 md:pt-32">
        <section className="rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm md:p-8">
          <h1 className="mb-3 text-4xl font-bold text-zinc-900">{title}</h1>
          <p className="mb-8 max-w-3xl text-sm leading-relaxed text-zinc-700">
            {intro}
          </p>
          <div className="space-y-7 text-sm leading-relaxed text-zinc-800">
            {children}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
