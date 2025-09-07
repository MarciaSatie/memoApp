// src/components/layout/RefreshBTN.jsx
"use client";

import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/app/firebase";
import { useAuth } from "@/app/provider/AuthProvider";
import { RefreshCw } from "lucide-react";

export default function RefreshDecks({ userId: userIdProp, onRefreshed }) {
  const { user } = useAuth?.() ?? { user: null };
  const userId = userIdProp ?? user?.uid;
  const [loading, setLoading] = useState(false);

  async function refreshAll() {
    if (!userId) return;
    setLoading(true);
    try {
      // Force fetch from server; this ALSO refreshes Firestore's local cache
      const q = query(collection(db, "decks"), where("userId", "==", userId));
      const snap = await getDocs(q, { source: "server" });
      const decks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onRefreshed?.(decks);
    } catch (e) {
      console.error("Refresh decks failed:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={refreshAll}
      disabled={loading || !userId}
      className="px-3 py-1 rounded bg-primary text-white disabled:opacity-60 hover:bg-bd"
      title="Force refresh decks from server"
      aria-label="Refresh decks"
    >
      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
    </button>
  );
}
