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

  // ----------------- helpers -----------------
  const isEditableTarget = (el) => {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  };
  // -------------------------------------------

  // Render 3 copies for infinite effect: [A | B | C]
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
  const [anim, setAnim] = useState(true);                 // transition on/off

  // Drag state (viewport)
  const drag = useRef({
    active: false,
    captured: false,   // becomes true after moving past threshold
    startX: 0,
    baseOffset: 0,
    moved: false,
  });

  // Card tap detection
  const tap = useRef({ virtI: -1, x: 0, y: 0 });

  // Thresholds
  const clickThreshold = 8;       // px to count as a click (tap)
  const dragAcquire = 8;          // px before the track starts following the pointer

  // Measure viewport width to order only currently visible cards
  const viewportRef = useRef(null);
  const [vpWidth, setVpWidth] = useState(0);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setVpWidth(Math.round(r.width));
    });
    ro.observe(el);
    setVpWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

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

  // -------------------- Drag handling (viewport; no pointer capture) --------------------
  const onPointerDown = (e) => {
    // left button only
    if (e.button !== undefined && e.button !== 0) return;
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    drag.current = {
      active: true,
      captured: false,
      startX: x,
      baseOffset: offset,
      moved: false,
    };
  };

  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const dx = x - drag.current.startX;

    if (!drag.current.captured && Math.abs(dx) >= dragAcquire) {
      drag.current.captured = true;
      setAnim(false); // only disable transition when we actually start dragging
    }

    if (!drag.current.captured) return;

    drag.current.moved = Math.abs(dx) >= clickThreshold;

    const min = -lastV * overlapStep;
    const max = 0;
    const nextOffset = drag.current.baseOffset + dx;
    const clamped = Math.max(min, Math.min(nextOffset, max));
    setOffset(clamped);
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    const wasCaptured = drag.current.captured;
    drag.current.active = false;

    if (wasCaptured) {
      const rawV = -offset / overlapStep;
      const nearest = clampV(Math.round(rawV));
      setAnim(true);
      setVIndex(nearest);
      setOffset(-nearest * overlapStep);
      if (canLoop) setTimeout(normalizeIfNeeded, animationMs + 20);
    } else {
      setAnim(true);
    }
  };

  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();
  const onMouseLeave = () => endDrag();
  // --------------------------------------------------------------------------------------

  // ---------- Z-INDEX ORDERING BY VISIBLE X-POSITION ----------
  // Map of virtI -> order (left→right among currently visible cards)
  const visibleOrder = useMemo(() => {
    const map = new Map();
    const buffer = itemWidth; // count partially visible neighbors
    const minX = -buffer;                // left boundary (relative to viewport)
    const maxX = vpWidth + buffer;       // right boundary

    // screenX for a card = virtI*overlapStep + offset
    const entries = [];
    for (let i = 0; i < TOTAL; i++) {
      const x = i * overlapStep + offset;
      // simple visibility check
      if (x + itemWidth > minX && x < maxX) {
        entries.push({ i, x });
      }
    }

    // Order left → right so rightmost gets highest z
    entries.sort((a, b) => a.x - b.x);
    entries.forEach((e, idx) => map.set(e.i, idx)); // 0..k-1

    return map;
  }, [TOTAL, overlapStep, itemWidth, offset, vpWidth]);

  // Keep card z-index modest so modals (z-50+) are on top; arrows use z-40.
  const resolveZIndex = (virtI) => {
    if (hoveredIndex === virtI) return 30; // hover wins within carousel
    const order = visibleOrder.get(virtI) ?? 0;
    return 10 + order; // 10..(10+visibleCount-1)
  };
  // ------------------------------------------------------------

  const getItemAt = (virtI) => items[virtI % N];

  // Card-level tap detection (robust desktop clicks)
  const onCardPointerDown = (virtI) => (e) => {
    tap.current = {
      virtI,
      x: e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0,
      y: e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0,
    };
    setHoveredIndex(virtI);
  };

  const onCardPointerUp = (item, virtI) => (e) => {
    setTimeout(() => setHoveredIndex(null), 0);
    if (drag.current.captured && drag.current.moved) return;

    const upX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const upY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    const dx = Math.abs(upX - tap.current.x);
    const dy = Math.abs(upY - tap.current.y);
    if (tap.current.virtI !== virtI) return;
    if (dx > clickThreshold || dy > clickThreshold) return;

    const realI = virtI % N;
    // Defer so snapping/normalize can finish first
    requestAnimationFrame(() => onItemClick?.(item, realI));
  };

  // Keyboard navigation (guard editable targets)
  const onViewportKeyDown = (e) => {
    if (isEditableTarget(e.target)) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  };

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
            // z-40 so common modals (z-50) render above; cards stay ≤ z-30
            className="absolute left-2 top-1/2 -translate-y-1/2 z-40 rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 rounded-full border bg-white/80 px-3 py-2 shadow hover:bg-white"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {/* viewport (transform-based; no native horizontal scroll) */}
      <div
        ref={viewportRef}
        className="relative w-full h-full overflow-hidden select-none touch-pan-y"
        tabIndex={0}
        role="group"
        aria-label="Overlap carousel"
        onKeyDown={onViewportKeyDown}
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
                className="absolute transition-transform duration-150 outline-none"
                style={{
                  top: 0,
                  left: virtI * overlapStep,
                  width: itemWidth,
                  zIndex: resolveZIndex(virtI),   // ≤ 30
                  transform:
                    hoveredIndex === virtI ? "translateY(-4px) scale(1.02)" : "none",
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (isEditableTarget(e.target)) return;
                  if (e.currentTarget !== e.target) return; // only when card itself is focused
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const realI = virtI % N;
                    onItemClick?.(item, realI);
                  }
                }}
                onPointerDown={onCardPointerDown(virtI)}
                onPointerUp={onCardPointerUp(item, virtI)}
                onMouseEnter={() => setHoveredIndex(virtI)}
                onMouseLeave={() => setHoveredIndex(null)}
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
