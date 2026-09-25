"use client";

import { useEffect } from "react";

export function ImageSecurityWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const isProtectedImageTarget = (event: Event) => {
      // Prefer composedPath to detect images rendered by wrappers (next/image, picture, etc.)
      const path: any[] = (event as any).composedPath
        ? (event as any).composedPath()
        : (event as any).path || [];

      for (const node of path) {
        if (!node) continue;
        if (node.nodeName === "IMG") {
          return true;
        }
        if (
          node instanceof Element &&
          node.hasAttribute &&
          node.hasAttribute("data-secure-image")
        ) {
          return true;
        }
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        if (
          target.tagName === "IMG" ||
          Boolean(target.closest("[data-secure-image]"))
        ) {
          return true;
        }
      }

      // If the image has pointer-events: none the event target may be an ancestor.
      // Use elementFromPoint to check the element directly under the pointer.
      try {
        const me = event as MouseEvent;
        if (typeof me.clientX === "number" && typeof me.clientY === "number") {
          const el = document.elementFromPoint(
            me.clientX,
            me.clientY,
          ) as Element | null;
          if (el) {
            if (
              el.tagName === "IMG" ||
              Boolean(el.closest("[data-secure-image]"))
            ) {
              return true;
            }
          }
        }
      } catch {
        // ignore cross-origin or other errors
      }

      return false;
    };

    const preventRightClick = (event: Event) => {
      const mouseEvent = event as MouseEvent;
      if (mouseEvent.button === 2 && isProtectedImageTarget(event)) {
        mouseEvent.preventDefault();
      }
    };

    const preventDrag = (event: Event) => {
      if (isProtectedImageTarget(event)) {
        const dragEvent = event as DragEvent;
        dragEvent.preventDefault();
      }
    };

    const preventContextMenu = (event: Event) => {
      if (isProtectedImageTarget(event)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventContextMenu, true);
    document.addEventListener("mousedown", preventRightClick, true);
    document.addEventListener("dragstart", preventDrag, true);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu, true);
      document.removeEventListener("mousedown", preventRightClick, true);
      document.removeEventListener("dragstart", preventDrag, true);
    };
  }, []);

  return <>{children}</>;
}
