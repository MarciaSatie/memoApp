// src/components/common/OverlapCarousel.jsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import Modal from "@/components/layout/Modal";

export default function OverlapCarousel({
  items = [],
  renderItem,                 // tile renderer (required)
  itemWidth = 288,
  overlapStep = 200,
  height = 480,
  className = "",
  showArrows = true,
  scrollStep,
  getZIndex,                  // optional z-index resolver

  /* ------- optional modal props ------- */
  enableModal = false,
  renderModalContent,         // (item, index) => JSX
  getModalTitle,              // (item, index) => string
  onItemOpen,                 // (item, index) => void
  onItemClose,                // () => void
}) {
  const scrollRef = useRef(null);
  const step = scrollStep ?? Math.max(180, overlapStep);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState({ item: null, index: -1 });

  // NEW: track which tile is hovered
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const trackWidth = useMemo(() => {
    if (items.length === 0) return 0;
    return (items.length - 1) * overlapStep + itemWidth + 40;
  }, [items.length, overlapStep, itemWidth]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const handleOpen = (item, index) => {
    if (!enableModal) return;
    setActive({ item, index });
    setOpen(true);
    onItemOpen?.(item, index);
  };

  const handleClose = () => {
    setOpen(false);
    setActive({ item: null, index: -1 });
    onItemClose?.();
  };

  // compute z-index per item. hovered item always on top
  const resolveZIndex = (item, index) => {
    if (hoveredIndex === index) return 10_000; // ensure top
    if (typeof getZIndex === "function") return getZIndex(item, index);
    return index; // default stacking
  };

  return (
    <div
      className={`relative rounded-2xl border bg-gray-900 ${className}`}
      style={{ height }}
    >
      {showArrows && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[1000] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[1000] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {/* viewport */}
      <div
        ref={scrollRef}
        className="relative w-full h-full overflow-x-auto overflow-y-hidden"
      >
        {/* track */}
        <div className="relative h-full m-10" style={{ width: trackWidth }}>
          {items.map((item, index) => (
            <div
              key={item.id ?? index}
              className={`absolute ${enableModal ? "cursor-pointer" : ""} transition-transform duration-150`}
              style={{
                top: 0,
                left: index * overlapStep,
                width: itemWidth,
                zIndex: resolveZIndex(item, index),
                transform:
                  hoveredIndex === index ? "translateY(-4px) scale(1.02)" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleOpen(item, index)}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>

      {enableModal && (
        <Modal
          open={open}
          onClose={handleClose}
          title={
            active.item && getModalTitle
              ? getModalTitle(active.item, active.index)
              : active.item?.title || "Details"
          }
        >
          {active.item && renderModalContent
            ? renderModalContent(active.item, active.index)
            : active.item
            ? (
              <div
                className="prose max-w-none tiptap-content"
                dangerouslySetInnerHTML={{
                  __html: active.item.content || "<p><em>No content</em></p>",
                }}
              />
            )
            : null}
        </Modal>
      )}
    </div>
  );
}
