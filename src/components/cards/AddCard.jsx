// src/components/cards/AddCard.jsx
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
import { addCard } from "@/data/card";

/* ---------------- Helpers ---------------- */
async function prettifyHtml(source) {
  try {
    const htmlPlugin = await import("prettier/plugins/html");
    const pretty = await prettier.format(source, {
      parser: "html",
      plugins: [htmlPlugin],
    });
    return pretty;
  } catch (err) {
    console.warn("⚠️ Prettier HTML plugin load/format failed:", err?.message || err);
    return source;
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

export default function AddCard({ deckId }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [content, setContent] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editorJSON, setEditorJSON] = useState(null);

  // NEW: keywords input (comma/semicolon/newline separated)
  const [keywordsText, setKeywordsText] = useState("");
  const keywords = useMemo(() => parseKeywords(keywordsText), [keywordsText]);

  async function handleSave() {
    setError("");

    if (!deckId) {
      setError("Missing deckId");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      const contentToSave = await prettifyHtml(content || "");
      const payload = {
        title: title.trim(),
        content: contentToSave,
        json: editorJSON ?? null,
        date: date || getCurrentDate(),
        contentClasses:
          "tiptap-content prose prose-slate max-w-none leading-relaxed",
        // ✅ NEW: save keywords array
        keywords, // e.g., ["react", "performance", "hooks"]
      };

      const newId = await addCard(deckId, payload);
      console.log("Card saved successfully, id:", newId);

      // Reset form
      setTitle("");
      setDate(getCurrentDate());
      setContent("");
      setEditorJSON(null);
      setKeywordsText("");
    } catch (e) {
      console.error(e);
      setError("Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!isHtmlMode || !content) return;
    (async () => {
      const pretty = await prettifyHtml(content);
      setContent(pretty);
    })();
  }, [isHtmlMode, content]);

  async function formatHtmlNow() {
    if (!content) return;
    const pretty = await prettifyHtml(content);
    setContent(prety);
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
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-xl px-3 py-2 bg-white text-gray-700"
        />
      </div>

      {/* NEW: Keywords input */}
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

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-2xl bg-bd text-gray-700 hover:bg-mmHover disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Card"}
      </button>
    </div>
  );
}
