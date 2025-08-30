// src/components/decks/AddDeck.jsx
"use client";

import { useState } from "react";
import { useAuth } from "@/app/provider/AuthProvider";
import { ThemeList } from "@/data/themeList";
import { createDeck } from "@/data/decks"; // ← adjust path if your file lives elsewhere

export default function AddDeck() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState(ThemeList[0]?.value ?? "pink");

  async function onSubmit(e) {

    if (!user || !title.trim()) return;

    await createDeck({
      userId: user.uid,
      title: title.trim(),
      theme,
      isFavorite: false,
    });

    // reset
    setTitle("");
    setTheme(ThemeList[0]?.value ?? "pink");
  }

  return (
    <div>
      <details className="border-bd border p-4 mb-4 rounded">
        <summary className="text-primary cursor-pointer text-lg font-semibold mb-2">
          Add New Deck
        </summary>

        <form onSubmit={onSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="New Deck Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 text-greyTxt rounded border-bd bg-background"
          />

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full p-2 text-greyTxt rounded bg-background border-bd"
          >
            {ThemeList.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon ? `${t.icon} ` : ""}{t.name} Theme
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!user || !title.trim()}
            className="w-full bg-primary text-white p-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Create Deck
          </button>
        </form>
      </details>
    </div>
  );
}
