// modal.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---- body lock helpers ----
let BODY_LOCKS = 0;
let PREV_OVERFLOW = "";
let PREV_PADDING_RIGHT = "";
function lockBody() {
  if (BODY_LOCKS === 0) {
    PREV_OVERFLOW = document.body.style.overflow;
    PREV_PADDING_RIGHT = document.body.style.paddingRight;
    const sw = window.innerWidth - document.documentElement.clientWidth;
    if (sw > 0) document.body.style.paddingRight = `${sw}px`;
    document.body.style.overflow = "hidden";
  }
  BODY_LOCKS++;
}
function unlockBody() {
  BODY_LOCKS = Math.max(0, BODY_LOCKS - 1);
  if (BODY_LOCKS === 0) {
    document.body.style.overflow = PREV_OVERFLOW || "";
    document.body.style.paddingRight = PREV_PADDING_RIGHT || "";
  }
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  closeOnBackdropClick = true,   // control backdrop close
  closeOnEsc = true,             // control Esc close
}) {
  const [mounted, setMounted] = useState(false);
  const backdropRef = useRef(null);
  const panelRef = useRef(null);

  // Track where the pointer went down so we can ignore mixed down/up
  const pointerDownInsidePanel = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && closeOnEsc) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    lockBody();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBody();
    };
  }, [open, onClose, closeOnEsc]);

  if (!open || !mounted) return null;

  // Backdrop mouse handlers (use pointer events for robustness)
  const handleBackdropPointerDown = (e) => {
    // If down starts inside the panel, mark it so we don't treat the eventual
    // backdrop click as an outside click.
    pointerDownInsidePanel.current = panelRef.current?.contains(e.target) ?? false;
  };

  const handleBackdropClick = (e) => {
    // Only close if:
    //  - backdrop closing is enabled
    //  - the click originated AND ended on the backdrop (not the panel)
    //  - the event target is exactly the backdrop (not a child)
    if (!closeOnBackdropClick) return;

    const startedInside = pointerDownInsidePanel.current;
    const endedOnBackdrop = e.target === backdropRef.current;
    const clickIsBackdrop = e.currentTarget === e.target;

    if (!startedInside && endedOnBackdrop && clickIsBackdrop) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-4xl h-[95vh] rounded-2xl bg-white p-6 shadow-xl text-foreground overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        // Block bubbling for safety (helps with parent click-away listeners)
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md border px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          aria-label="Close modal"
        >
          ✕
        </button>
        {title && (
          <h2 className="mb-4 text-xl text-primary font-bold">{title}</h2>
        )}
        <div className="prose max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-blockquote:text-foreground prose-a:text-primary prose-code:text-foreground">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
