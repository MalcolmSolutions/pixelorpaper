// How big a print's public web preview is, given its original. Used by the
// admin product form (which makes the preview in the browser) and by the
// server's check of it. scripts/prepare-images.mjs applies the same rule to
// the existing catalog; keep the two in step.

export const PREVIEW_LONG_EDGE = 2000;
export const MIN_PREVIEW_EDGE = 600;

/**
 * Longest side of the preview for an original with this longest side:
 * 2000px, or half size (never below 600px) for originals up to 2000px, so a
 * paid download is always clearly larger than the free preview.
 */
export function previewEdge(originalEdge: number) {
  if (originalEdge > PREVIEW_LONG_EDGE) return PREVIEW_LONG_EDGE;
  return Math.max(MIN_PREVIEW_EDGE, Math.round(originalEdge / 2));
}
