import { useState } from "react";
import { ThemeList } from "@/data/themeList";
import {updateDeck } from "@/data/decks";

export default function UpdateDeck({deck}) {
    const [title, setTitle] = useState(deck.title);
    const [theme, setTheme] = useState(ThemeList[0]?.value ?? "pink");

    const handleUpdate = async (e) => {
        e.stopPropagation();

        try {
            await updateDeck(deck.id, {
                title: title.trim(),
                theme,
            });// Firestore update
        } catch (err) {
            console.error(err);
        }
    }

  return (
    <div>
      <div className="border-bd border p-4 mb-4 rounded">
          Edit Deck

        <form onSubmit={handleUpdate} className="space-y-2">
          <input
            type="text"
            placeholder= {title}
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
            className="w-full bg-primary text-white p-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Create Deck
          </button>
        </form>
      </div>
    </div>
  );
}
