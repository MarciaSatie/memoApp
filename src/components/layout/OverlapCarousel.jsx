// src/components/common/OverlapCarousel.jsx
"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

export default function OverlapCarousel({
  items = [],
  renderItem,                 // (item, realIndex) => JSX (required)
  itemWidth = 288,
  overlapStep = 200,          // horizontal gap between card anchors
  height = 480,
  className = "",
  showArrows = true,
  onItemClick,                // optional: (item, realIndex) => void
  initialIndex = 0,
  animationMs = 260,
  loop = true,                // enable infinite loop
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
  const PAD = canLoop ? N : 0;           // middle block starts at index N
  const TOTAL = N * COPIES;
  const startVIndex = canLoop
    ? PAD + Math.max(0, Math.min(initialIndex, N - 1))
    : Math.max(0, Math.min(initialIndex, N - 1));
  const lastV = TOTAL - 1;

  // Visual state
  const [vIndex, setVIndex] = useState(startVIndex);      // virtual index [0..TOTAL-1]
  const [offset, setOffset] = useState(() => -startVIndex * overlapStep);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [anim, setAnim] = useState(true);                 // transition on/off (drag disables)
  const drag = useRef({ active: false, startX: 0, baseOffset: 0, moved: false });
  const clickThreshold = 6; // px to differentiate click vs drag

  // Track widths
  const copyWidth = useMemo(
    () => (N - 1) * overlapStep + itemWidth + 40,
    [N, overlapStep, itemWidth]
  );
  const trackWidth = useMemo(() => {
    if (!N) return 0;
    if (!canLoop) return copyWidth;
    return (TOTAL - 1) * overlapStep + itemWidth + 40;
  }, [N, TOTAL, canLoop, copyWidth, overlapStep, itemWidth]);

  const clampV = useCallback((i) => Math.max(0, Math.min(i, lastV)), [lastV]);

  // Move to a virtual index (optionally without animation)
  const snapToV = useCallback(
    (targetV, withAnim = true) => {
      const clamped = clampV(targetV);
      setAnim(withAnim);
      setVIndex(clamped);
      setOffset(-clamped * overlapStep);
    },
    [clampV, overlapStep]
  );

  // After any move, if we’re in A or C, jump to the equivalent in B (no animation)
  const normalizeIfNeeded = useCallback(() => {
    if (!canLoop) return;
    if (vIndex < PAD) {
      const nv = vIndex + N;
      setAnim(false);
      setVIndex(nv);
      setOffset(-nv * overlapStep);
    } else if (vIndex >= PAD + N) {
      const nv = vIndex - N;
      setAnim(false);
      setVIndex(nv);
      setOffset(-nv * overlapStep);
    }
  }, [canLoop, vIndex, PAD, N, overlapStep]);

  // Buttons
  const next = useCallback(() => {
    snapToV(vIndex + 1, true);
    if (canLoop) setTimeout(normalizeIfNeeded, animationMs + 20);
  }, [vIndex, snapToV, canLoop, normalizeIfNeeded, animationMs]);

  const prev = useCallback(() => {
    snapToV(vIndex - 1, true);
    if (canLoop) setTimeout(normalizeIfNeeded, animationMs + 20);
  }, [vIndex, snapToV, canLoop, normalizeIfNeeded, animationMs]);

  // Keep offset synced if vIndex changes
  useEffect(() => {
    setOffset(-vIndex * overlapStep);
  }, [vIndex, overlapStep]);

  // Pointer drag (mouse/touch/pen)
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

    const min = -lastV * overlapStep;
    const max = 0;
    const nextOffset = drag.current.baseOffset + dx;
    const clamped = Math.max(min, Math.min(nextOffset, max));
    setOffset(clamped);
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;

    const rawV = -offset / overlapStep;
    const nearest = clampV(Math.round(rawV));
    setAnim(true);
    setVIndex(nearest);
    setOffset(-nearest * overlapStep);

    if (canLoop) setTimeout(normalizeIfNeeded, animationMs + 20);
  };

  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();
  const onMouseLeave = () => endDrag();

  // Click passthrough (ignore if it was a drag)
  const handleItemClick = (item, virtI) => {
    if (drag.current.moved) return;
    const realI = virtI % N;
    onItemClick?.(item, realI);
  };

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
  };

  // ---------- Z-INDEX: active on top, neighbors next, hover wins ----------
  const activeReal = vIndex % N;
  const circDist = (a, b) => {
    const d = Math.abs(a - b);
    return Math.min(d, N - d);
  };
  const resolveZIndex = (virtI) => {
    const realI = virtI % N;
    if (hoveredIndex === virtI) return 3000;     // hover always on top
    const dist = circDist(realI, activeReal);   // 0 for active, grows outward
    const base = 2000;                          // center z for active
    const step = 20;                            // bigger = stronger separation
    return base - dist * step;
  };
  // -----------------------------------------------------------------------

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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[3100] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[3100] rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {/* viewport (transform-based; no native horizontal scroll) */}
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
                key={`${item.id ?? (virtI % N)}__${virtI}`}
                className="absolute transition-transform duration-150"
                style={{
                  top: 0,
                  left: virtI * overlapStep,
                  width: itemWidth,
                  zIndex: resolveZIndex(virtI),
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
