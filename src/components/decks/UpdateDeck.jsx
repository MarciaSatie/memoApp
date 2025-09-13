// src/components/decks/UpdateDeck.jsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ThemeList } from "@/data/themeList";
import { getSubdecksCached, updateDeckAndSubdecks } from "@/data/decks";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

export default function UpdateDeck({ deck }) {
  const deckId = deck?.id;

  /* ───────── Deck fields ───────── */
  const [title, setTitle] = useState(deck?.title ?? "");
  const [theme, setTheme] = useState(deck?.theme ?? ThemeList[0]?.value ?? "pink");

  /* ───────── Subdecks ───────── */
  const [subs, setSubs] = useState([]);          // [{id, name, _editing?}]
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  const listRef = useRef(null); // to scroll/focus the added row

  // consistent widths + light gray text
  const inputCls =
    "w-full p-2 rounded border-bd bg-background text-neutral-200 outline-none focus:bg-neutral-900/60";
  const btnCls =
    "p-2 rounded border-bd bg-background hover:bg-mmHover text-neutral-200";
  const sectionCls = "max-w-3xl w-full mx-auto";

  // originals → compute diff on save
  const initialDeckRef = useRef({
    title: deck?.title ?? "",
    theme: deck?.theme ?? (ThemeList[0]?.value ?? "pink"),
  });
  const initialSubsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!deckId) return;
      try {
        setLoadingSubs(true);
        setError("");
        const list = await getSubdecksCached(deckId);
        if (cancelled) return;
        const clean = (Array.isArray(list) ? list : []).map(s => ({
          id: s.id,
          name: s.name || "",
        }));
        setSubs(clean);
        initialSubsRef.current = clean;
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load subdecks");
      } finally {
        if (!cancelled) setLoadingSubs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  const startEdit = (id) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, _editing: true } : s));
  };
  const cancelEdit = (id) => {
    const orig = initialSubsRef.current.find(s => s.id === id);
    setSubs(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, name: orig ? orig.name : s.name, _editing: false }
          : s
      )
    );
  };
  const changeName = (id, name) => {
    setSubs(prev => prev.map(s => (s.id === id ? { ...s, name } : s)));
  };
  const removeLocal = (id) => {
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  // add and immediately show/focus
  const addLocalSubdeck = useCallback(() => {
    const name = newName.trim();
    if (!name) return;

    const newId = `new:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

    setSubs(prev => {
      const next = [...prev, { id: newId, name, _editing: true }];
      // focus after paint
      requestAnimationFrame(() => {
        const row = listRef.current?.querySelector(`[data-subdeck-id="${newId}"] input`);
        row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        row?.focus();
        row?.select?.();
      });
      return next;
    });

    setNewName("");
  }, [newName]);

  const diffs = useMemo(() => {
    const initial = initialSubsRef.current;
    const initialMap = new Map(initial.map(s => [s.id, s]));
    const current = subs;

    const create = current
      .filter(s => s.id.startsWith("new:"))
      .map(s => ({ name: (s.name || "").trim() }))
      .filter(s => s.name.length > 0);

    const keptExisting = current.filter(s => !s.id.startsWith("new:"));
    const keptIds = new Set(keptExisting.map(s => s.id));

    const remove = initial.filter(s => !keptIds.has(s.id)).map(s => s.id);

    const update = keptExisting
      .map(s => {
        const orig = initialMap.get(s.id);
        if (!orig) return null;
        const nameChanged = (orig.name || "") !== (s.name || "");
        if (!nameChanged) return null;
        return { id: s.id, name: (s.name || "").trim() };
      })
      .filter(Boolean);

    const deckPatch = {};
    if ((title || "") !== (initialDeckRef.current.title || "")) deckPatch.title = title.trim();
    if ((theme || "") !== (initialDeckRef.current.theme || "")) deckPatch.theme = theme;

    return { deckPatch, create, update, remove };
  }, [subs, title, theme]);

  const [savingAll, setSavingAll] = useState(false);
  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!deckId || savingAll) return;

    try {
      setSavingAll(true);
      setError("");
      await updateDeckAndSubdecks(deckId, {
        deck: diffs.deckPatch,
        subdecks: {
          create: diffs.create,
          update: diffs.update,
          remove: diffs.remove,
        },
      });

      // refresh snapshots + real IDs
      initialDeckRef.current = { title: title.trim(), theme };
      const list = await getSubdecksCached(deckId);
      const clean = (Array.isArray(list) ? list : []).map(s => ({
        id: s.id,
        name: s.name || "",
      }));
      setSubs(clean);
      initialSubsRef.current = clean;
    } catch (e2) {
      setError(e2?.message || "Failed to save changes");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="border-bd border p-4 mb-4 rounded bg-background text-neutral-200">
      <div className={sectionCls}>
        <h3 className="mb-4 font-semibold">Edit Deck</h3>

        {/* Deck fields (Theme below Title) */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1 text-neutral-300">Title</label>
            <input
              type="text"
              placeholder={title || "Deck title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-neutral-300">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={inputCls}
            >
              {ThemeList.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon ? `${t.icon} ` : ""}{t.name} Theme
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="my-4 h-px bg-bd" />

        {/* Subdecks */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <h4 className="font-medium">Subdecks</h4>
            <div className="flex items-center gap-2 w-full max-w-sm">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLocalSubdeck();
                  }
                }}
                placeholder="New subdeck name"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addLocalSubdeck}
                disabled={!newName.trim()}
                className="h-9 w-9 inline-grid place-items-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                title="Add subdeck"
                aria-label="Add subdeck"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

          {loadingSubs ? (
            <p className="text-sm text-neutral-400">Loading subdecks…</p>
          ) : subs.length === 0 ? (
            <p className="text-sm text-neutral-400">No subdecks yet.</p>
          ) : (
            <ul ref={listRef} className="space-y-2">
              {subs.map((sd) => (
                <li
                  key={sd.id}
                  data-subdeck-id={sd.id}
                  className="flex items-center justify-between gap-2 border-bd border rounded p-2 bg-background"
                >
                  <div className="flex-1 min-w-0">
                    {sd._editing ? (
                      <input
                        value={sd.name}
                        onChange={(e) => changeName(sd.id, e.target.value)}
                        className={inputCls}
                        autoFocus
                      />
                    ) : (
                      <span className="text-neutral-200 break-words">
                        {sd.name || "Untitled"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {sd._editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSubs(prev =>
                              prev.map(s =>
                                s.id === sd.id ? { ...s, _editing: false } : s
                              )
                            )
                          }
                          className={btnCls}
                          title="Done"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(sd.id)}
                          className={btnCls}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(sd.id)}
                          className={btnCls}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLocal(sd.id)}
                          className={`${btnCls} text-red-400`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Save all */}
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {savingAll ? "Updating…" : "Update Deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
