import { db } from "@/app/firebase";
import {
  doc,
  getDoc,
  getDocFromCache,   // ✅ singular (document)
  getDocFromServer,  // ✅ singular (document)
} from "firebase/firestore";

export async function getDeckById(deckId) {
  const deckRef = doc(db, "decks", deckId);
  const snap = await getDoc(deckRef);
  if (!snap.exists()) throw new Error("Deck not found");
  return { id: snap.id, ...snap.data() };
}

export async function getDeckByIdCached(deckId) {
  const deckRef = doc(db, "decks", deckId);
  console.log("deckRef:", deckRef);   // ✅ fixed

  try {
    const cached = await getDocFromCache(deckRef);
    if (cached.exists()) return { id: cached.id, ...cached.data() };
  } catch (_) {
    // cache miss is fine
  }

  const server = await getDocFromServer(deckRef);
  if (!server.exists()) throw new Error("Deck not found");
  return { id: server.id, ...server.data() };
}
