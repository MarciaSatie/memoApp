// src/components/common/OverlapCarousel.jsx
"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";

export default function OverlapCarousel({
  items = [],
  renderItem,                 // (item, index) => JSX (required)
  itemWidth = 288,
  overlapStep = 200,
  height = 480,
  className = "",
  showArrows = true,
  getZIndex,                  // optional z-index resolver
  onItemClick,                // optional: (item, realIndex) => void
  initialIndex = 0,
  animationMs = 260,
  loop = true,                // infinite loop enabled by default
}) {
  const N = items.length;
  const canLoop = loop && N >= 2;
  if (N === 0) {
    return (
      <div
        className={`relative rounded-2xl border bg-gray-900 ${className}`}
        style={{ height }}
      />
    );
  }

  // We render 3 copies for infinite effect: [A | B | C]
  const COPIES = canLoop ? 3 : 1;
  const PAD = canLoop ? N : 0; // middle block starts at index N
  const TOTAL = N * COPIES;

  // starting virtual index (park in the middle copy)
  const startVIndex = canLoop
    ? PAD + Math.max(0, Math.min(initialIndex, N - 1))
    : Math.max(0, Math.min(initialIndex, N - 1));

  const lastV = TOTAL - 1;

  // visual state
  const [vIndex, setVIndex] = useState(startVIndex);     // virtual index in [0, TOTAL-1]
  const [offset, setOffset] = useState(() => -startVIndex * overlapStep);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [anim, setAnim] = useState(true);
  const drag = useRef({ active: false, startX: 0, baseOffset: 0, moved: false });
  const clickThreshold = 6; // px

  // width of one logical track copy
  const copyWidth = useMemo(() => {
    return (N - 1) * overlapStep + itemWidth + 40;
  }, [N, overlapStep, itemWidth]);

  // full visual width (3 copies or 1)
  const trackWidth = useMemo(() => {
    if (!N) return 0;
    if (!canLoop) return copyWidth;
    // NOTE: copies are laid “seamlessly” — the absolute positioning uses left = i*overlapStep
    // so total width depends on TOTAL and overlapStep:
    return (TOTAL - 1) * overlapStep + itemWidth + 40;
  }, [N, TOTAL, canLoop, copyWidth, overlapStep, itemWidth]);

  const clampV = useCallback(
    (i) => Math.max(0, Math.min(i, lastV)),
    [lastV]
  );

  // Snap to a virtual index (optionally without animation)
  const snapToV = useCallback(
    (targetV, withAnim = true) => {
      const clamped = clampV(targetV);
      setAnim(withAnim);
      setVIndex(clamped);
      setOffset(-clamped * overlapStep);
    },
    [clampV, overlapStep]
  );

  const normalizeIfNeeded = useCallback(() => {
    if (!canLoop) return;
    // If we've drifted to the edges (copy A or C), jump back into middle copy (B)
    if (vIndex < PAD) {
      // Jump forward by N (same real card in middle block)
      const nv = vIndex + N;
      setAnim(false);
      setVIndex(nv);
      setOffset(-nv * overlapStep);
    } else if (vIndex >= PAD + N) {
      // Jump back by N
      const nv = vIndex - N;
      setAnim(false);
      setVIndex(nv);
      setOffset(-nv * overlapStep);
    }
  }, [canLoop, vIndex, PAD, N, overlapStep]);

  // Buttons
  const next = useCallback(() => {
    snapToV(vIndex + 1, true);
    // after animation, normalize (re-center into middle copy)
    if (canLoop) {
      setTimeout(normalizeIfNeeded, animationMs + 20);
    }
  }, [vIndex, snapToV, canLoop, normalizeIfNeeded, animationMs]);

  const prev = useCallback(() => {
    snapToV(vIndex - 1, true);
    if (canLoop) {
      setTimeout(normalizeIfNeeded, animationMs + 20);
    }
  }, [vIndex, snapToV, canLoop, normalizeIfNeeded, animationMs]);

  // Keep offset synced if vIndex changes from outside
  useEffect(() => {
    setOffset(-vIndex * overlapStep);
  }, [vIndex, overlapStep]);

  // Pointer drag (mouse/touch/pen) with snap
  const onPointerDown = (e) => {
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    drag.current = { active: true, startX: x, baseOffset: offset, moved: false };
    setAnim(false);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const dx = x - drag.current.startX;
    if (Math.abs(dx) > clickThreshold) drag.current.moved = true;

    // Clamp within virtual bounds
    const min = -lastV * overlapStep;
    const max = 0;
    const nextOffset = drag.current.baseOffset + dx;
    const clamped = Math.max(min, Math.min(nextOffset, max));
    setOffset(clamped);
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;

    // Snap to nearest virtual index from current offset
    const rawV = -offset / overlapStep;
    const nearest = clampV(Math.round(rawV));
    setAnim(true);
    setVIndex(nearest);
    setOffset(-nearest * overlapStep);

    if (canLoop) {
      setTimeout(normalizeIfNeeded, animationMs + 20);
    }
  };

  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();
  const onMouseLeave = () => endDrag();

  // Click passthrough (ignore if user dragged)
  const handleItemClick = (item, virtI) => {
    if (drag.current.moved) return;
    const realI = virtI % N; // map back to real index
    onItemClick?.(item, realI);
  };

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
  };

  const resolveZIndex = (item, virtI) => {
    const realI = virtI % N;
    if (hoveredIndex === virtI) return 100;
    if (typeof getZIndex === "function") return getZIndex(item, realI);
    return realI; // stable layering by real index
  };

  // Helper to get the item for a virtual position
  const getItemAt = (virtI) => items[virtI % N];

  return (
    <div
      className={`relative rounded-2xl border bg-gray-900 ${className}`}
      style={{ height }}
    >
      {showArrows && N > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[60] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[60] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {/* viewport (no native scroll; transform-based) */}
      <div
        className="relative w-full h-full overflow-hidden select-none touch-pan-y"
        tabIndex={0}
        role="group"
        aria-label="Overlap carousel"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseLeave={onMouseLeave}
        style={{ cursor: drag.current.active ? "grabbing" : "grab" }}
      >
        {/* track translated by `offset` */}
        <div
          className="relative h-full m-10 will-change-transform"
          style={{
            width: trackWidth,
            transform: `translateX(${offset}px)`,
            transition: anim ? `transform ${animationMs}ms ease-out` : "none",
          }}
        >
          {Array.from({ length: TOTAL }).map((_, virtI) => {
            const item = getItemAt(virtI);
            return (
              <div
                key={`${item.id ?? (virtI % N)}__${virtI}`} // unique per virtual slot
                className="absolute transition-transform duration-150"
                style={{
                  top: 0,
                  left: virtI * overlapStep,
                  width: itemWidth,
                  zIndex: resolveZIndex(item, virtI),
                  transform:
                    hoveredIndex === virtI ? "translateY(-4px) scale(1.02)" : "none",
                }}
                onMouseEnter={() => setHoveredIndex(virtI)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleItemClick(item, virtI)}
                aria-current={virtI === vIndex ? "true" : undefined}
              >
                {renderItem(item, virtI % N)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
