// src/components/common/OverlapCarousel.jsx
"use client";

import React, { useMemo, useRef, useState } from "react";

export default function OverlapCarousel({
  items = [],
  renderItem,                 // (item, index) => JSX (required)
  itemWidth = 288,
  overlapStep = 200,
  height = 480,
  className = "",
  showArrows = true,
  scrollStep,
  getZIndex,                  // optional z-index resolver
  onItemClick,                // optional: (item, index) => void
}) {
  const scrollRef = useRef(null);
  const step = scrollStep ?? Math.max(180, overlapStep);

  // track which tile is hovered (to float it on top)
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const trackWidth = useMemo(() => {
    if (items.length === 0) return 0;
    return (items.length - 1) * overlapStep + itemWidth + 40;
  }, [items.length, overlapStep, itemWidth]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // compute z-index per item. hovered item always on top
  const resolveZIndex = (item, index) => {
    if (hoveredIndex === index) return 100; // ensure top
    if (typeof getZIndex === "function") return getZIndex(item, index);
    return index; // default stacking: later items over earlier ones
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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[50] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[100] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
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
              className={`absolute transition-transform duration-150`}
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
              onClick={() => onItemClick?.(item, index)}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
