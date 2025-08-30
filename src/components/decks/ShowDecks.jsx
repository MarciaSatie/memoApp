"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/provider/AuthProvider";
import { getUserDecksCached } from "@/data/decks";

export default function ShowDecks() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const load = async () => {
      try {
        const list = await getUserDecksCached(user.uid); // cache-first
        if (isMounted) setDecks(list);
      } catch (err) {
        console.error(err);
        if (isMounted) setMsg(`Failed to load decks: ${err.message}`);
      }
    };

    load();

    return () => { isMounted = false; };
  }, [user]); // ← run when user changes

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">ShowDecks</h2>

      {msg && <p className="text-sm text-greyTxt mb-2">{msg}</p>}

      {decks.length === 0 ? (
        <p className="text-sm text-greyTxt">No decks yet.</p>
      ) : (
        decks.map((deck) => (
          <div
            key={deck.id}
            className="mb-2 p-2 border border-bd rounded hover:bg-neutral-700 cursor-pointer"
          >
            <h3 className="text-lg font-semibold">{deck.title}</h3>
          </div>
        ))
      )}
    </div>
  );
}
