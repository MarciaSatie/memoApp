import { db } from "@/app/firebase";
import {
  doc,collection, query, orderBy,
  getDoc,addDoc, serverTimestamp,
  getDocsFromCache,  getDocFromCache,
  getDocsFromServer, getDocFromServer,
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
    const cached = await getDocsFromCache(deckRef);
    if (cached.exists()) return { id: cached.id, ...cached.data() };
  } catch (_) {
    // cache miss is fine
  }

  const server = await getDocsFromServer(deckRef);
  if (!server.exists()) throw new Error("Deck not found");
  return { id: server.id, ...server.data() };
}

export async function addCard(deckId, { title, content, json }) {
    const cardsRef = collection(db, "decks", deckId, "cards");// to tell where to add the card

    //addDoc automatically generates a unique ID for each card, so we don’t have to manage IDs manually.
      const docRef = await addDoc(cardsRef, {
        deckId,
        title,
        content,
        json, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id // return the new card's ID;
}



// decks/{deckId}/cards — cache-first, fallback to server
export async function getCardsByDeckCached(deckId) {
  const cardsRef = collection(db, "decks", deckId, "cards");
  const q = query(cardsRef, orderBy("createdAt", "desc"));

  try {
    const cachedSnap = await getDocsFromCache(q);
    if (!cachedSnap.empty) {
      return cachedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (_) {
    // cache miss is fine
  }

  const serverSnap = await getDocsFromServer(q);
  return serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}
