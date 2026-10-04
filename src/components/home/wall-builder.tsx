"use client";

import Link from "next/link";
import { useState } from "react";
import type { Print } from "@/components/framed-print";
import {
  RoomMockup,
  SIDEBOARD_ROOM,
  slotCount,
  wallColour,
} from "@/components/room-mockup";
import { cn } from "@/lib/utils";
import type { FrameFinish, GalleryLayout, WallTone } from "@/types/room";

const LAYOUT_OPTIONS: { value: GalleryLayout; label: string }[] = [
  { value: "trio", label: "Trio" },
  { value: "feature", label: "Feature" },
  { value: "grid", label: "Grid" },
  { value: "salon", label: "Salon" },
];

const WALL_OPTIONS: { value: WallTone; label: string }[] = [
  { value: "sand", label: "Sand" },
  { value: "grey", label: "Warm grey" },
  { value: "sage", label: "Sage" },
  { value: "white", label: "Off-white" },
];

const FRAME_OPTIONS: { value: FrameFinish; label: string }[] = [
  { value: "black", label: "Black" },
  { value: "oak", label: "Oak" },
  { value: "white", label: "White" },
];

export function WallBuilder({ prints: options }: { prints: Print[] }) {
  const [layout, setLayout] = useState<GalleryLayout>("salon");
  const [wall, setWall] = useState<WallTone>("grey");
  const [frame, setFrame] = useState<FrameFinish>("black");
  const [offset, setOffset] = useState(0);

  const count = slotCount(layout);
  const prints = Array.from(
    { length: count },
    (_, i) => options[(offset + i) % options.length],
  );

  return (
    <section
      id="wall-builder"
      className="bg-sand-light"
      aria-labelledby="wall-builder-title"
    >
      <div className="container-page section grid gap-8 lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-16 lg:gap-y-0">
        <div className="space-y-4 lg:col-span-5 lg:row-start-2">
          <p className="eyebrow">Gallery wall builder</p>
          <h2 id="wall-builder-title">Build your own wall</h2>
          <p className="max-w-[44ch] text-ink-muted">
            Choose a layout, wall colour and frame, then shuffle prints until
            the arrangement feels like home.
          </p>
        </div>

        {/* DOM order puts the preview between intro and controls on small screens. */}
        <figure className="-mx-gutter sm:mx-0 lg:col-span-7 lg:col-start-6 lg:row-span-4 lg:row-start-1 lg:self-center">
          <RoomMockup
            prints={prints}
            layout={layout}
            wall={wall}
            frame={frame}
            photo={SIDEBOARD_ROOM}
            className="aspect-square sm:aspect-[5/4]"
          />
          <figcaption className="mt-3 flex items-center justify-between gap-4 px-gutter text-sm text-ink-muted sm:px-0">
            <span>
              {count} prints · {frame} frames
            </span>
            <button
              type="button"
              className="link text-ink"
              onClick={() => setOffset((o) => (o + 1) % options.length)}
            >
              Shuffle prints
            </button>
          </figcaption>
        </figure>

        <div className="lg:col-span-5 lg:row-start-3 lg:pt-8">
          <dl className="divide-y border-y">
            <OptionRow label="Layout">
              {LAYOUT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={layout === o.value}
                  onClick={() => setLayout(o.value)}
                  className="chip"
                >
                  {o.label}
                </button>
              ))}
            </OptionRow>

            <OptionRow label="Wall">
              {WALL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={wall === o.value}
                  aria-label={o.label}
                  title={o.label}
                  onClick={() => setWall(o.value)}
                  className={cn(
                    "size-9 rounded-full border transition",
                    wall === o.value
                      ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-sand-light"
                      : "border-line hover:border-ink",
                  )}
                  style={{ backgroundColor: wallColour(o.value) }}
                />
              ))}
            </OptionRow>

            <OptionRow label="Frame">
              {FRAME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={frame === o.value}
                  onClick={() => setFrame(o.value)}
                  className="chip"
                >
                  {o.label}
                </button>
              ))}
            </OptionRow>
          </dl>

          <div className="pt-6">
            <Link href="/products" className="btn btn-primary">
              Choose your prints
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <dt className="eyebrow sm:w-20 sm:shrink-0">{label}</dt>
      <dd
        role="group"
        aria-label={label}
        className="flex flex-wrap items-center gap-2"
      >
        {children}
      </dd>
    </div>
  );
}
