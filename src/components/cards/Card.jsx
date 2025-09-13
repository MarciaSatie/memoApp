// src/components/cards/Card.jsx
"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/layout/Modal";
import { updateCard, deleteCard } from "@/data/card";
import EditCard from "@/components/cards/EditCard";
import { Pencil, Trash2 } from "lucide-react";

/**
 * Reusable card tile + modal (view/edit/delete)
 *
 * Props:
 * - deckId: string
 * - card:   { id, title, content, date, createdAt, contentClasses, ... }
 * - index?: number            // 0-based index to display as #index+1
 * - total?: number            // optional total, to show "3 / 20"
 * - showIndex?: boolean       // default true
 * - showDate?: boolean        // default true
 * - height?: number           // default 440
 * - className, headerClass, bodyClass?: string
 * - onUpdated?: (updatedId) => void
 * - onDeleted?: (deletedId) => void
 */
export default function Card({
  deckId,
  card,
  index,
  total,
  showIndex = true,
  showDate = true,
  height = 440,
  className = "",
  headerClass = "",
  bodyClass = "",
  onUpdated,
  onDeleted,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  if (!card) return null;

  // ---- Formatting helpers ----
  const displayIndex = useMemo(() => {
    if (typeof index !== "number" || index < 0) return null;
    const oneBased = index + 1;
    return typeof total === "number" && total > 0 ? `${oneBased} / ${total}` : `${oneBased}`;
  }, [index, total]);

  // Prefer explicit card.date, else fall back to createdAt if present
  const formattedPrimaryDate = useMemo(() => {
    return formatCardDate(card?.date) || formatCardDate(card?.createdAt) || null;
  }, [card?.date, card?.createdAt]);

  // ----------------------------

  const openModal = () => {
    setError("");
    setEditing(false);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(false);
    setError("");
  };

  const handleDelete = async (e) => {
    e?.stopPropagation?.(); // don't trigger tile click
    if (!deckId || !card.id) return setError("Missing deck/card id");
    const ok = window.confirm("Delete this card? This cannot be undone.");
    if (!ok) return;

    setRemoving(true);
    setError("");
    try {
      await deleteCard(deckId, card.id);
      setOpen(false);
      onDeleted?.(card.id);
    } catch (e) {
      console.error("deleteCard failed:", e?.code, e?.message, e);
      setError(e?.message || "Failed to delete card");
    } finally {
      setRemoving(false);
    }
  };

  const handleEditIcon = (e) => {
    e?.stopPropagation?.();
    setEditing(true);
    setOpen(true);
  };

  return (
    <>
      {/* Tile (for carousel/grid) */}
      <article
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
          }
        }}
        role="button"
        aria-haspopup="dialog"
        tabIndex={0}
        className={[
          "relative rounded-2xl bg-white text-gray-800 shadow border overflow-hidden",
          "transition-transform duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
          className,
        ].join(" ")}
        style={{ height }}
        aria-label={`${card.title || "Card"}${displayIndex ? ` #${displayIndex}` : ""}`}
      >
        {/* index badge (top-left) */}
        {showIndex && displayIndex && (
          <div className="absolute left-2 top-2 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 text-xs font-medium">
              #{displayIndex}
            </span>
          </div>
        )}

        {/* top-right action icons on the tile */}
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={handleEditIcon}
            className="p-1.5 rounded-full border text-gray-600 bg-white/90 hover:bg-white"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-full border bg-white/90 hover:bg-white text-red-600"
            aria-label="Delete"
            title="Delete"
            disabled={removing}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-6">
          <header className={["px-4 pt-4 pb-2", headerClass].join(" ")}>
            <h3 className="text-lg font-semibold text-primary line-clamp-2">
              {card.title || "Untitled"}
            </h3>
            {showDate && formattedPrimaryDate && (
              <p className="text-xs text-gray-500 mt-0.5">{formattedPrimaryDate}</p>
            )}
          </header>

          <div className="px-4 pb-4 h-[calc(100%-70px)]">
            <div
              className={[
                "tiptap tiptap-content leading-relaxed space-y-3",
                "h-full overflow-auto border border-bd rounded-xl p-3 bg-white",
                card.contentClasses || "",
                bodyClass,
              ].join(" ")}
              dangerouslySetInnerHTML={{
                __html: card.content || "<p><em>No content</em></p>",
              }}
            />
          </div>
        </div>
      </article>

      {/* Modal (view/edit/delete) */}
      <Modal
        open={open}
        onClose={closeModal}
        title={
          editing
            ? `Edit Card${displayIndex ? ` • #${displayIndex}` : ""}`
            : `${card.title || "Card Details"}${displayIndex ? ` • #${displayIndex}` : ""}`
        }
      >
        <div className="space-y-4 relative">
          {error && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* top-right action icons inside the modal view mode */}
          {!editing && (
            <div className="absolute right-0 -top-2 flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-full border bg-white hover:bg-gray-50"
                onClick={() => setEditing(true)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil size={18} />
              </button>
              <button
                type="button"
                className="p-2 rounded-full border bg-white hover:bg-gray-50 text-red-600"
                onClick={handleDelete}
                disabled={removing}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {/* VIEW MODE */}
          {!editing && (
            <>
              {showDate && formattedPrimaryDate && (
                <div className="text-xs text-gray-500">{formattedPrimaryDate}</div>
              )}
              <div
                className="tiptap tiptap-content leading-relaxed space-y-3 border border-bd rounded-xl p-3 overflow-auto bg-white"
                dangerouslySetInnerHTML={{
                  __html: card.content || "<p><em>No content</em></p>",
                }}
              />
            </>
          )}

          {/* EDIT MODE — uses EditCard */}
          {editing && (
            <EditCard
              deckId={deckId}
              card={card}
              onSaved={(id) => {
                setEditing(false);
                onUpdated?.(id); // tell parent to refresh
              }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

/* ---------- utils ---------- */
function formatCardDate(input) {
  if (!input) return null;

  // Firestore Timestamp-like ({ toDate() } or { seconds, nanoseconds })
  try {
    if (typeof input?.toDate === "function") {
      const d = input.toDate();
      return formatDateSafe(d);
    }
    if (
      typeof input === "object" &&
      input !== null &&
      typeof input.seconds === "number"
    ) {
      const ms = input.seconds * 1000 + Math.floor((input.nanoseconds || 0) / 1e6);
      return formatDateSafe(new Date(ms));
    }
  } catch {
    // fall through to generic parsing
  }

  // Date | string | number
  return formatDateSafe(new Date(input));
}

function formatDateSafe(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  // e.g., "Sep 13, 2025"
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
