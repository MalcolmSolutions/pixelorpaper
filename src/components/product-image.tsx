"use client";

import { resolveProductImage } from "@/lib/images";

interface ProductImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  onLoad?: () => void;
}

export function ProductImage({
  src,
  alt,
  priority = false,
  className = "",
  onLoad,
}: ProductImageProps) {
  const resolvedSrc = resolveProductImage(src);

  // Use plain img to avoid runtime optimizer differences across hosting targets.
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 pointer-events-none select-none object-cover w-full h-full ${className}`}
      onLoad={onLoad}
      onError={() => {
        console.error(`Failed to load image: ${resolvedSrc}`);
      }}
    />
  );
}
