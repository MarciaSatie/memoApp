// src/components/cards/EditCard.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
const CodeMirror = dynamic(
  () => import("@uiw/react-codemirror").then((m) => m.default),
  { ssr: false }
);
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import TipTapEditor from "../editor/TipTapEditor";
import prettier from "prettier/standalone";

// deck + card data helpers
import {
  updateCard,
  addCard,
  deleteCard,
  updateCardInSubdeck,
  addCardToSubdeck,
  deleteCardInSubdeck,
} from "@/data/card";
import { getSubdecksCached } from "@/data/decks";

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

export default function EditCard({
  deckId,
  card,                 // { id, title, content, json, date, keywords?: string[], subdeckId?: string|null }
  onSaved,              // (cardId) => void
  onCancel,             // () => void
}) {
  // content fields
  const [title, setTitle] = useState(card?.title || "");
  const [date, setDate] = useState(card?.date || "");
  const [content, setContent] = useState(card?.content || "");
  const [editorJSON, setEditorJSON] = useState(card?.json ?? null);

  // keywords
  const [keywordsText, setKeywordsText] = useState(
    Array.isArray(card?.keywords) ? card.keywords.join(", ") : ""
  );
  const keywords = useMemo(() => parseKeywords(keywordsText), [keywordsText]);

  // subdeck list + selection
  const [subdecks, setSubdecks] = useState([]); // [{id, name}]
  const [selectedSubdeckId, setSelectedSubdeckId] = useState(card?.subdeckId ?? null);

  // misc
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load subdecks for dropdown (once per deckId)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!deckId) return;
      try {
        const list = await getSubdecksCached(deckId);
        if (cancelled) return;
        const clean = (Array.isArray(list) ? list : []).map((s) => ({
          id: s.id,
          name: s.name || "Untitled",
        }));
        setSubdecks(clean);
      } catch (e) {
        if (!cancelled) console.warn("Failed to load subdecks:", e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Sync local state if a different card is passed in
  useEffect(() => {
    setTitle(card?.title || "");
    setDate(card?.date || "");
    setContent(card?.content || "");
    setEditorJSON(card?.json ?? null);
    setKeywordsText(Array.isArray(card?.keywords) ? card.keywords.join(", ") : "");
    setSelectedSubdeckId(card?.subdeckId ?? null);
    setError("");
    setIsHtmlMode(false);
  }, [card?.id]);

  // Prettify when switching into HTML mode
  useEffect(() => {
    if (!isHtmlMode || !content) return;
    (async () => {
      const pretty = await prettifyHtml(content);
      setContent(pretty);
    })();
  }, [isHtmlMode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function formatHtmlNow() {
    if (!content) return;
    const pretty = await prettifyHtml(content);
    setContent(pretty);
  }

  async function handleSave() {
    setError("");
    if (!deckId || !card?.id) {
      setError("Missing deckId or card id");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      const contentToSave = isHtmlMode ? await prettifyHtml(content || "") : (content || "");
      const payload = {
        title: title.trim(),
        date: date || null,
        content: contentToSave,
        json: editorJSON ?? null,
        keywords, // save keywords array
        // contentClasses: (omit to keep existing)
      };

      const oldSubdeckId = card?.subdeckId ?? null;
      const newSubdeckId = selectedSubdeckId || null;

      // (A) no location change -> simple update
      if (oldSubdeckId === newSubdeckId) {
        if (newSubdeckId) {
          // still inside same subdeck
          await updateCardInSubdeck(deckId, newSubdeckId, card.id, payload);
        } else {
          // still in main/root
          await updateCard(deckId, card.id, payload);
        }
        onSaved?.(card.id);
        return;
      }

      // (B) location changed -> move (create in new place, delete old)
      let newId;
      if (!oldSubdeckId && newSubdeckId) {
        // main -> subdeck
        newId = await addCardToSubdeck(deckId, newSubdeckId, payload);
        await deleteCard(deckId, card.id);
      } else if (oldSubdeckId && !newSubdeckId) {
        // subdeck -> main
        newId = await addCard(deckId, payload);
        await deleteCardInSubdeck(deckId, oldSubdeckId, card.id);
      } else {
        // subdeck A -> subdeck B
        newId = await addCardToSubdeck(deckId, newSubdeckId, payload);
        await deleteCardInSubdeck(deckId, oldSubdeckId, card.id);
      }

      onSaved?.(newId || card.id);
    } catch (e) {
      console.error("❌ save/move failed:", e?.code, e?.message, e);
      setError(e?.message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 rounded-2xl shadow-soft border space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Card title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white text-gray-700 flex-1 border rounded-xl px-3 py-2"
        />
        <input
          type="date"
          value={date || ""}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-xl px-3 py-2 bg-white text-gray-700"
        />
      </div>

      {/* NEW: Subdeck selector */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Subdeck</label>
        <select
          value={selectedSubdeckId ?? ""}
          onChange={(e) => setSelectedSubdeckId(e.target.value || null)}
          className="w-full rounded-xl border bg-white text-gray-700 px-3 py-2"
        >
          <option value="">Main deck</option>
          {subdecks.map((sd) => (
            <option key={sd.id} value={sd.id}>
              {sd.name}
            </option>
          ))}
        </select>
      </div>

      {/* Keywords editor */}
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <button
              onClick={() => setIsHtmlMode((v) => !v)}
              className="text-sm px-3 py-1 rounded-xl border hover:bg-gray-50 text-gray-700"
            >
              {isHtmlMode ? "Switch to Editor" : "Switch to HTML"}
            </button>

            {isHtmlMode && (
              <button
                onClick={formatHtmlNow}
                className="ml-2 text-sm px-3 py-1 rounded-xl border hover:bg-gray-50 text-gray-700"
                disabled={!content}
                title="Prettify the HTML"
              >
                Format HTML
              </button>
            )}
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

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-2xl bg-bd text-gray-700 hover:bg-mmHover disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-2xl border text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
