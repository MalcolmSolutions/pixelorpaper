/** Layout for text pages: About, Contact and the legal pages. */
export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <article className="container-page section">
      <div className="max-w-prose">
        <header className="space-y-4 border-b pb-8 md:pb-10">
          <h1>{title}</h1>
          <p className="text-lg text-ink-muted">{intro}</p>
        </header>
        <div className="divide-y">{children}</div>
      </div>
    </article>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 py-8">
      {/* Sub-sections of the page, so the h3 size of the type scale. */}
      <h2 className="text-h3">{title}</h2>
      <div className="space-y-3 text-ink-muted">{children}</div>
    </section>
  );
}
