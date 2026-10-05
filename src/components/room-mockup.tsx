import Image from "next/image";
import { FramedPrint, type Print } from "@/components/framed-print";
import { cn } from "@/lib/utils";
import type {
  FrameFinish,
  Furniture,
  GalleryLayout,
  WallTone,
} from "@/types/room";

/** CSS colour for a wall tone (variables defined in globals.css). */
export function wallColour(tone: WallTone) {
  return `var(--wall-${tone})`;
}

type Slot = { left: number; top: number; width: number };

// Frame positions as % of a 2:1 gallery area. A 4:5 frame of width w%
// is 2.5w% tall in that area.
const LAYOUTS: Record<GalleryLayout, Slot[]> = {
  single: [{ left: 33, top: 7.5, width: 34 }],
  trio: [
    { left: 9, top: 17.5, width: 26 },
    { left: 37, top: 17.5, width: 26 },
    { left: 65, top: 17.5, width: 26 },
  ],
  feature: [
    { left: 13, top: 27.5, width: 18 },
    { left: 35, top: 12.5, width: 30 },
    { left: 69, top: 27.5, width: 18 },
  ],
  grid: [
    { left: 31.5, top: 4, width: 17 },
    { left: 51.5, top: 4, width: 17 },
    { left: 31.5, top: 53.5, width: 17 },
    { left: 51.5, top: 53.5, width: 17 },
  ],
  salon: [
    { left: 14, top: 10, width: 22 },
    { left: 39, top: 4, width: 14 },
    { left: 39, top: 46, width: 14 },
    { left: 56, top: 20, width: 20 },
    { left: 79, top: 32, width: 11 },
  ],
};

export function slotCount(layout: GalleryLayout) {
  return LAYOUTS[layout].length;
}

/** A real room photo to hang prints in, with its free wall area. */
export type RoomPhoto = {
  src: string;
  width: number;
  height: number;
  /** Gallery area as % of the photo: left/top edge and width. */
  gallery: { left: number; top: number; width: number };
};

/** Living room with an oak sideboard; the wall between lamp and vases. */
export const SIDEBOARD_ROOM: RoomPhoto = {
  src: "/images/room-sideboard.jpg",
  width: 4000,
  height: 1848,
  gallery: { left: 31, top: 14, width: 33 },
};

/**
 * Illustrated room with a gallery wall. The caller sets the aspect ratio via
 * className; extra height becomes wall space above the gallery.
 */
export function RoomMockup({
  prints,
  layout = "trio",
  wall = "sand",
  furniture = "sideboard",
  frame = "black",
  galleryWidth = 60,
  photo,
  tintWall = false,
  galleryScale = 1,
  zoom = 1,
  preload = false,
  className,
}: {
  prints: Print[];
  layout?: GalleryLayout;
  wall?: WallTone;
  furniture?: Furniture;
  frame?: FrameFinish;
  /** Gallery area width as % of the room width. */
  galleryWidth?: number;
  /** Use a room photo instead of the illustration (furniture is ignored). */
  photo?: RoomPhoto;
  /** Tint the photo's wall with the `wall` colour. */
  tintWall?: boolean;
  /** Enlarge the photo's gallery about its bottom centre. */
  galleryScale?: number;
  /** Zoom into the photo, keeping its top edge and centring the gallery. */
  zoom?: number;
  preload?: boolean;
  className?: string;
}) {
  if (photo) {
    // The photo box keeps the photo's proportions and fills the height,
    // so the gallery stays fixed to the same patch of wall when the sides
    // are cropped. Rooms are always narrower than the photo.
    const centreX =
      zoom === 1 ? 50 : photo.gallery.left + photo.gallery.width / 2;
    return (
      <div className={cn("relative overflow-hidden bg-canvas", className)}>
        <div
          className="absolute top-0 left-1/2"
          style={{
            aspectRatio: `${photo.width} / ${photo.height}`,
            height: `${zoom * 100}%`,
            transform: `translateX(-${centreX}%)`,
          }}
        >
          <Image
            src={photo.src}
            alt=""
            fill
            sizes={`(min-width: 64rem) ${Math.round(100 * zoom)}vw, ${Math.round(175 * zoom)}vw`}
            preload={preload}
            className="object-cover"
          />
          {tintWall && (
            <div
              aria-hidden="true"
              className="absolute inset-0 mix-blend-multiply transition-colors duration-500"
              style={{ backgroundColor: wallColour(wall) }}
            />
          )}
          <Gallery
            prints={prints}
            layout={layout}
            frame={frame}
            className="absolute origin-bottom transition-transform duration-500 ease-out-soft"
            style={{
              left: `${photo.gallery.left}%`,
              top: `${photo.gallery.top}%`,
              width: `${photo.gallery.width}%`,
              transform: galleryScale === 1 ? undefined : `scale(${galleryScale})`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex flex-col overflow-hidden", className)}
      style={{ backgroundColor: wallColour(wall) }}
    >
      {/* Soft daylight from the upper left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgb(255_255_255/0.55),transparent_65%)]"
      />

      <div className="relative flex min-h-0 flex-1 items-end justify-center pb-[3%]">
        <Gallery
          prints={prints}
          layout={layout}
          frame={frame}
          className="relative"
          style={{ width: `${galleryWidth}%` }}
        />
      </div>

      {furniture === "sideboard" ? <Sideboard /> : <Sofa />}

      {/* Oak floor with skirting board */}
      <div
        aria-hidden="true"
        className="relative aspect-[100/9] w-full border-t-[5px] border-t-(--skirting)"
        style={{
          background:
            "linear-gradient(to bottom, rgb(0 0 0 / 0.08), transparent 40%), repeating-linear-gradient(90deg, var(--floor-oak) 0 16%, var(--floor-seam) 16% 16.3%)",
        }}
      />
    </div>
  );
}

/** Prints arranged in a 2:1 gallery area. Position it via className/style. */
function Gallery({
  prints,
  layout,
  frame,
  className,
  style,
}: {
  prints: Print[];
  layout: GalleryLayout;
  frame: FrameFinish;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("aspect-[2/1]", className)} style={style}>
      {LAYOUTS[layout].map((slot, i) => (
        <FramedPrint
          key={i}
          print={prints[i % prints.length]}
          frame={frame}
          className="absolute transition-all duration-500 ease-out-soft"
          style={{
            left: `${slot.left}%`,
            top: `${slot.top}%`,
            width: `${slot.width}%`,
          }}
        />
      ))}
    </div>
  );
}

function Sideboard() {
  return (
    <svg
      viewBox="0 0 400 150"
      aria-hidden="true"
      className="relative z-10 mx-auto -mb-[2%] block w-[52%]"
    >
      {/* Vase with branch */}
      <path
        d="M76 44C70 24 58 12 46 2M76 44C82 28 92 18 104 12"
        fill="none"
        stroke="#6b7a5e"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="46" cy="4" r="4" fill="#8a9466" />
      <circle cx="104" cy="12" r="4" fill="#8a9466" />
      <circle cx="58" cy="16" r="3" fill="#8a9466" />
      <ellipse cx="76" cy="64" rx="16" ry="17" fill="#ebe3d6" />
      <rect x="70" y="42" width="12" height="10" fill="#ebe3d6" />
      {/* Books */}
      <rect x="296" y="70" width="64" height="10" fill="#9fb2bf" />
      <rect x="302" y="61" width="54" height="9" fill="#2e2e2e" />
      {/* Cabinet */}
      <rect x="0" y="80" width="400" height="8" fill="#a98258" />
      <rect x="8" y="88" width="384" height="46" fill="#c4a079" />
      <path d="M136 92V130M264 92V130" stroke="#a98258" strokeWidth="2" />
      <rect x="30" y="134" width="8" height="16" fill="#8c6a45" />
      <rect x="362" y="134" width="8" height="16" fill="#8c6a45" />
    </svg>
  );
}

function Sofa() {
  return (
    <svg
      viewBox="0 0 400 130"
      aria-hidden="true"
      className="relative z-10 mx-auto -mb-[2%] block w-[72%]"
    >
      <rect x="22" y="8" width="356" height="72" rx="18" fill="#d6d0c6" />
      <rect x="70" y="26" width="70" height="44" rx="12" fill="#e8dcc8" />
      <rect x="262" y="30" width="64" height="40" rx="12" fill="#c7d3c0" />
      <rect x="0" y="62" width="400" height="50" rx="16" fill="#cbc4b8" />
      <rect x="0" y="40" width="40" height="72" rx="16" fill="#c4bdb0" />
      <rect x="360" y="40" width="40" height="72" rx="16" fill="#c4bdb0" />
      <rect x="28" y="112" width="8" height="18" fill="#8c6a45" />
      <rect x="364" y="112" width="8" height="18" fill="#8c6a45" />
    </svg>
  );
}
