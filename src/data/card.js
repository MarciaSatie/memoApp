import { db } from "@/app/firebase";
import {
  doc,collection, query, orderBy,
  getDoc,addDoc, serverTimestamp,
  getDocsFromCache,  getDocFromCache,
  getDocsFromServer, getDocFromServer,
  updateDoc, deleteDoc,
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


// decks/{deckId}/cards/{cardId} — update
export async function updateCard(deckId, cardId, updates) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);
  await updateDoc(cardRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
} 

// decks/{deckId}/cards/{cardId} — delete
export async function deleteCard(deckId, cardId) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);
  await deleteDoc(cardRef);
}


// decks/{deckId}/cards/{cardId} — get single card
export async function getCardById(deckId, cardId) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);  
  const snap = await getDoc(cardRef);
  if (!snap.exists()) throw new Error("Card not found");
  return { id: snap.id, ...snap.data() };
} 


export async function getCardByIdCached(deckId, cardId) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);
  try {
    const cached = await getDocFromCache(cardRef);
    if (cached.exists()) return { id: cached.id, ...cached.data() };
  } catch (_) {
    // cache miss is fine
  }
  const server = await getDocFromServer(cardRef);
  if (!server.exists()) throw new Error("Card not found");
  return { id: server.id, ...server.data() };
} 