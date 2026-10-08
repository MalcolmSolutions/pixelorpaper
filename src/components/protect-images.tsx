"use client";

import { useEffect } from "react";

/**
 * Turns off the right-click menu and dragging on images, so "Save image as…"
 * isn't one click away. Only a deterrent: the real protection is that pages
 * only ever show web previews, and full-size originals are kept private and
 * sold as downloads. Links and text are unaffected.
 */
export function ProtectImages() {
  useEffect(() => {
    const onImage = (event: Event) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    };
    document.addEventListener("contextmenu", onImage);
    document.addEventListener("dragstart", onImage);
    return () => {
      document.removeEventListener("contextmenu", onImage);
      document.removeEventListener("dragstart", onImage);
    };
  }, []);
  return null;
}
