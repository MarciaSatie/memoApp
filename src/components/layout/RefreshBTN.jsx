// src/components/layout/RefreshBTN.jsx
"use client";

import { useState } from "react";
import {
  doc, getDoc,
  collection, getDocs,
  query, where,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { RefreshCw } from "lucide-react";


export default function RefreshBTN({ deckId, onRefreshed }) {
  const [loading, setLoading] = useState(false);

  // Accept string id OR object with .id
  const deckIdStr = typeof deckId === "string" ? deckId : deckId?.id;

  async function refreshAll() {
    if (!deckIdStr) {
      console.warn("RefreshBTN: missing deckId (got:", deckId, ")");
      return;
    }
    setLoading(true);
    try {
      console.log("[Refresh] deckId =", deckIdStr);

      // 1) Deck (force server)
      const deckRef = doc(db, "decks", deckIdStr);
      const deckSnap = await getDoc(deckRef, { source: "server" });
      const deck = deckSnap.exists()
        ? { id: deckSnap.id, ...deckSnap.data() }
        : null;
      console.log("[Refresh] deck exists?", deckSnap.exists());

      // 2) Cards: try subcollection /decks/{id}/cards first
      const subCol = collection(db, "decks", deckIdStr, "cards");
      const subSnap = await getDocs(subCol, { source: "server" });
      let cards = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log("[Refresh] subcollection cards:", cards.length);

      // Fallback: top-level /cards?deckId=...
      if (cards.length === 0) {
        const q = query(collection(db, "cards"), where("deckId", "==", deckIdStr));
        const topSnap = await getDocs(q, { source: "server" });
        cards = topSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("[Refresh] top-level cards:", cards.length);
      }

      onRefreshed?.({ deck, cards });
    } catch (e) {
      console.error("[Refresh] failed:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={refreshAll}
      disabled={loading || !deckIdStr}
      className="px-3 py-1 rounded bg-primary text-white disabled:opacity-60 hover:bg-bd"
      title="Force refresh from server"
    >
      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
    </button>
  );
}
