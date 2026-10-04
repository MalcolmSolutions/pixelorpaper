import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  link,
}: {
  eyebrow?: string;
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 md:mb-12">
      <div className="space-y-3">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="link shrink-0 text-sm">
          {link.label}
        </Link>
      )}
    </div>
  );
}
