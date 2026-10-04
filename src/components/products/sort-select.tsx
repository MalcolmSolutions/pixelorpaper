"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export type SortOption = { value: string; label: string; href: string };

/** Quiet native select that navigates to the chosen option's URL. */
export function SortSelect({
  options,
  value,
  className,
}: {
  options: SortOption[];
  value: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={cn("flex items-center gap-2 text-sm", className)}
      data-pending={pending || undefined}
    >
      <span className="text-ink-muted">Sort</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => {
            const option = options.find((o) => o.value === e.target.value);
            if (option) {
              startTransition(() => router.push(option.href, { scroll: false }));
            }
          }}
          className="cursor-pointer appearance-none rounded-sm bg-transparent py-1 pr-5 text-ink"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 10 6"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-0 w-2.5 -translate-y-1/2"
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </span>
    </label>
  );
}
