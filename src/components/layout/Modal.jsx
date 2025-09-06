"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom"; // portal renders above app (into document.body)

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);

    // lock body scroll
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = orig;
    };
  }, [onClose]);

  // Render the modal into document.body so it overlays the entire app.
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-[100%] h-[95%] max-w-4xl rounded-2xl bg-white p-6 shadow-xl text-foreground overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md border px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          aria-label="Close modal"
        >
          ✕
        </button>

        {title && <h2 className="mb-4 text-xl text-primary font-bold">{title}</h2>}

        {/* 
          If the content you pass in uses `prose`, Typography will
          set a light gray body color. This wrapper forces prose
          elements to use your theme colors instead.
        */}
        <div className="
          prose max-w-none
          prose-headings:text-foreground
          prose-p:text-foreground
          prose-li:text-foreground
          prose-strong:text-foreground
          prose-em:text-foreground
          prose-blockquote:text-foreground
          prose-a:text-primary
          prose-code:text-foreground
        ">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
