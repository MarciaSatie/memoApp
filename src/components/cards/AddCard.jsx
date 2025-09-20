// src/components/cards/AddCard.jsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
const CodeMirror = dynamic(
  () => import("@uiw/react-codemirror").then((m) => m.default),
  { ssr: false }
);
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import TipTapEditor from "../editor/TipTapEditor";
import prettier from "prettier/standalone";

import {
  addCard,               // root (main deck)
  addCardToSubdeck,      // subdeck
  getSubdecksCached,     // for the Location select
  updateCard,
  updateCardInSubdeck,
} from "@/data/card";

/* ---------------- Helpers ---------------- */
async function prettifyHtml(source) {
  try {
    const htmlPlugin = await import("prettier/plugins/html");
    const pretty = await prettier.format(source || "", {
      parser: "html",
      plugins: [htmlPlugin],
    });
    return pretty;
  } catch (err) {
    console.warn("⚠️ Prettier HTML plugin load/format failed:", err?.message || err);
    return source || "";
  }
}

function getCurrentDate() {
  const date = new Date();
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Split on comma/semicolon/newline; trim; dedupe case-insensitively
function parseKeywords(raw) {
  if (!raw) return [];
  const parts = raw
    .split(/[,\n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

/**
 * Props:
 *   - deckId: string | { id: string }
 *   - onClose?: () => void   // called after Save button (save & close)
 */
export default function AddCard({ deckId, onClose }) {
  // ✅ normalize deckId (accept string or deck object)
  const deckIdStr = typeof deckId === "string" ? deckId : deckId?.id ?? null;

  // Track the created card id so hotkey saves update instead of duplicating
  const [currentCardId, setCurrentCardId] = useState(null);

  // content fields
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [content, setContent] = useState("");
  const [editorJSON, setEditorJSON] = useState(null);

  // keywords (text area + derived list)
  const [keywordsText, setKeywordsText] = useState("");
  const keywords = useMemo(() => parseKeywords(keywordsText), [keywordsText]);

  // location (root vs subdeck)
  const [selectedSubdeckId, setSelectedSubdeckId] = useState(""); // "" => main deck
  const [subdecks, setSubdecks] = useState([]);
  const [loadingSubdecks, setLoadingSubdecks] = useState(false);

  // ui
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Prevent click-away close by stopping event bubbling from inside
  const rootRef = useRef(null);
  const stopBubble = (e) => {
    e.stopPropagation();
  };

  // Log normalized deckId when it changes
  useEffect(() => {
    console.log("AddCard deckId prop:", deckId, "→ normalized:", deckIdStr);
  }, [deckId, deckIdStr]);

  // Load subdecks list
  useEffect(() => {
    let cancelled = false;
    if (!deckIdStr) {
      setSubdecks([]);
      return;
    }
    (async () => {
      try {
        setLoadingSubdecks(true);
        const list = await getSubdecksCached(deckIdStr);
        if (!cancelled) setSubdecks(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setSubdecks([]);
      } finally {
        if (!cancelled) setLoadingSubdecks(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckIdStr]);

  // Prettify when switching into HTML mode
  useEffect(() => {
    if (!isHtmlMode || !content) return;
    (async () => {
      const pretty = await prettifyHtml(content);
      setContent(pretty);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHtmlMode]);

  async function formatHtmlNow() {
    if (!content) return;
    const pretty = await prettifyHtml(content);
    setContent(pretty);
  }

  // Build payload with current UI state
  const buildPayload = useCallback(async () => {
    const contentToSave = isHtmlMode ? await prettifyHtml(content || "") : (content || "");
    return {
      title: title.trim(),
      content: contentToSave,
      json: editorJSON ?? null,
      date: date || getCurrentDate(),
      contentClasses: "tiptap-content prose prose-slate max-w-none leading-relaxed",
      keywords,
    };
  }, [content, editorJSON, isHtmlMode, title, date, keywords]);

  // Save (create if no id yet, update otherwise).
  // stay=true  → hotkey save; keep editing; do not clear; show "Saved ✓"
  // stay=false → button save; then close via onClose()
  const handleSave = useCallback(async (stay = false) => {
    setError("");

    // Guard
    if (!deckIdStr || typeof deckIdStr !== "string") {
      console.warn("AddCard: invalid deckId prop at save time:", deckId, "normalized:", deckIdStr);
      setError("Missing or invalid deckId");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload = await buildPayload();

      // Create first time
      if (!currentCardId) {
        let newId;
        if (selectedSubdeckId) {
          newId = await addCardToSubdeck(deckIdStr, selectedSubdeckId, payload);
        } else {
          newId = await addCard(deckIdStr, payload);
        }
        setCurrentCardId(newId);
      } else {
        // Update afterwards
        if (selectedSubdeckId) {
          await updateCardInSubdeck(deckIdStr, selectedSubdeckId, currentCardId, payload);
        } else {
          await updateCard(deckIdStr, currentCardId, payload);
        }
      }

      if (stay) {
        // Keep editing; no clearing; show tiny success blip
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1200);
      } else {
        // Save button: close if parent provided onClose
        if (typeof onClose === "function") onClose();
      }
    } catch (e) {
      console.error("❌ AddCard save failed:", e?.code, e?.message, e);
      setError(e?.message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  }, [
    deckIdStr,
    deckId,
    title,
    selectedSubdeckId,
    currentCardId,
    onClose,
    buildPayload,
  ]);

  // Global hotkey: Ctrl/⌘+S → save & keep editing
  useEffect(() => {
    const onKeyDown = (e) => {
      const isSaveCombo = (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S");
      if (isSaveCombo) {
        e.preventDefault();
        handleSave(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  return (
    <div
      ref={rootRef}
      className="p-4 rounded-2xl shadow-soft border space-y-4 bg-white"
      // Stop bubbling so outside click handlers won't close us
      onMouseDownCapture={stopBubble}
      onClickCapture={stopBubble}
      onTouchStartCapture={stopBubble}
    >
      {/* Title + Date */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Card title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white text-gray-700 flex-1 border rounded-xl px-3 py-2"
          disabled={saving}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-xl px-3 py-2 bg-white text-gray-700"
          disabled={saving}
        />
      </div>

      {/* Location (Main deck or a subdeck) */}
      <div className="flex flex-col gap-2">
        <label className="block text-sm text-gray-700">Location</label>
        <select
          value={selectedSubdeckId}
          onChange={(e) => setSelectedSubdeckId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 bg-white text-gray-700"
          disabled={saving || loadingSubdecks || !deckIdStr || currentCardId /* lock location after first save */}
          title={currentCardId ? "Location locked after first save" : undefined}
        >
          <option value="">Main deck</option>
          {subdecks.map((sd) => (
            <option key={sd.id} value={sd.id}>
              {sd.name || "Untitled subdeck"}
            </option>
          ))}
        </select>
        {currentCardId && (
          <p className="text-xs text-gray-500">Location is locked after the first save.</p>
        )}
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Keywords
          <span className="ml-2 text-xs text-gray-500">
            (separate with comma, semicolon, or newline)
          </span>
        </label>
        <textarea
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          placeholder="e.g. react, performance; hooks"
          className="w-full min-h-[72px] rounded-xl border bg-white text-gray-700 px-3 py-2"
          disabled={saving}
        />
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => (
              <span
                key={`${kw}-${i}`}
                className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Editor / HTML toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <button
              onClick={() => setIsHtmlMode((v) => !v)}
              className="text-sm px-3 py-1 rounded-xl border hover:bg-gray-50 text-gray-700"
              disabled={saving}
            >
              {isHtmlMode ? "Switch to Editor" : "Switch to HTML"}
            </button>

            {isHtmlMode && (
              <button
                onClick={formatHtmlNow}
                className="ml-2 text-sm px-3 py-1 rounded-xl border hover:bg-gray-50 text-gray-700"
                disabled={!content || saving}
                title="Prettify the HTML"
              >
                Format HTML
              </button>
            )}
          </div>

          {/* Hotkey hint + saved indicator */}
          <div className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 border rounded">Ctrl/⌘+S</kbd> to save
            {justSaved && <span className="ml-2 text-green-600">Saved ✓</span>}
          </div>
        </div>

        {isHtmlMode ? (
          <CodeMirror
            value={content}
            height="600px"
            extensions={[html()]}
            onChange={(value) => setContent(value)}
            theme={oneDark}
          />
        ) : (
          <TipTapEditor
            value={content}
            onChange={(htmlVal, jsonVal) => {
              setContent(htmlVal);
              setEditorJSON(jsonVal);
            }}
            disabled={isHtmlMode}
            className="border rounded-xl p-3 bg-white text-gray-700 min-h-[600px] max-h-[600px]"
          />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Save & Close */}
      <button
        onClick={() => handleSave(false)}
        disabled={saving}
        className="px-4 py-2 rounded-2xl bg-bd text-gray-700 hover:bg-mmHover disabled:opacity-60"
        title="Save and close"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
