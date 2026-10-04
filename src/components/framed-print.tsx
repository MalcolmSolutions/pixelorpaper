import Image from "next/image";
import { Artwork } from "@/components/artwork";
import { cn } from "@/lib/utils";
import type { ArtworkKey, ProductImage } from "@/types/product";
import type { FrameFinish } from "@/types/room";

/** Something that can hang in a frame: placeholder artwork or a photo. */
export type Print = ArtworkKey | ProductImage;

const FRAME_CLASSES: Record<FrameFinish, string> = {
  black: "bg-ink",
  oak: "bg-[#b8925f]",
  white: "bg-white ring-1 ring-black/10",
};

/**
 * A print in a thin frame with a white mount. Size it via className.
 * By default the frame is 4:5 and photos are cropped to fit; with
 * `natural` the frame follows the photo's own proportions.
 */
export function FramedPrint({
  print,
  frame = "black",
  natural = false,
  sizes = "20vw",
  loading,
  className,
  style,
}: {
  print: Print;
  frame?: FrameFinish;
  natural?: boolean;
  /** `sizes` for photo prints, matching the rendered frame width. */
  sizes?: string;
  loading?: "eager" | "lazy";
  className?: string;
  style?: React.CSSProperties;
}) {
  const isPhoto = typeof print !== "string";
  const fitted = isPhoto && natural;

  return (
    <div
      className={cn(
        "p-[3.5%] shadow-[0_10px_22px_-10px_rgb(0_0_0/0.4)]",
        !fitted && "aspect-[4/5]",
        FRAME_CLASSES[frame],
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          "bg-white shadow-[inset_0_1px_3px_rgb(0_0_0/0.12)]",
          fitted ? "p-[5%]" : "h-full p-[9%]",
        )}
      >
        {isPhoto ? (
          <Image
            src={print.src}
            alt={print.alt}
            width={print.width}
            height={print.height}
            sizes={sizes}
            loading={loading}
            className={cn(
              "block w-full bg-sand-light",
              fitted ? "h-auto" : "h-full object-cover",
            )}
          />
        ) : (
          <Artwork name={print} className="block h-full w-full" />
        )}
      </div>
    </div>
  );
}
