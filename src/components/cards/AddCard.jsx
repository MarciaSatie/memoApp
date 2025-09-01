"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { db } from "../../app/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
const CodeMirror = dynamic(
  () => import("@uiw/react-codemirror").then((m) => m.default),
  { ssr: false }
);
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import TipTapEditor from "../editor/TipTapEditor";
import prettier from "prettier/standalone";

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
  return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
}

export default function AddCard({ deckId }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [content, setContent] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editorJSON, setEditorJSON] = useState(null);

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

      await addDoc(collection(db, "decks", deckId, "cards"), {
        title: title.trim(),
        date: date || new Date().toISOString().split("T")[0],
        content: contentToSave,
        contentClasses: "tiptap-content prose prose-slate max-w-none leading-relaxed",
        createdAt: serverTimestamp(),
        json: editorJSON ?? null,
      });
      console.log("Card saved successfully");

      // Reset form
      setTitle("");
      setDate("");
      setContent("");
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
  }, [isHtmlMode]);

  async function formatHtmlNow() {
    if (!content) return;
    const pretty = await prettifyHtml(content);
    setContent(pretty);
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

      <div>
        <div className="flex items-center justify-between mb-2 max">
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
            onChange={(html, json) => {
              setContent(html);
              setEditorJSON(json);
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
