// src/data/card.js
import { db } from "@/app/firebase";
import {
  doc, collection, query, orderBy,
  getDoc, addDoc, serverTimestamp,
  getDocsFromCache, getDocFromCache,
  getDocsFromServer, getDocFromServer,
  updateDoc, deleteDoc,
} from "firebase/firestore";

/* ---------------- Helpers ---------------- */
function sanitizeKeywords(input) {
  if (!input) return [];
  // Accept array or a single string, trim & dedupe (case-insensitive)
  const arr = Array.isArray(input) ? input : [String(input)];
  const seen = new Set();
  const out = [];
  for (let v of arr) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s); // preserve original casing for display
    }
  }
  return out;
}

/* ---------------- Decks ---------------- */
export async function getDeckById(deckId) {
  const deckRef = doc(db, "decks", deckId);
  const snap = await getDoc(deckRef);
  if (!snap.exists()) throw new Error("Deck not found");
  return { id: snap.id, ...snap.data() };
}

export async function getDeckByIdCached(deckId) {
  const deckRef = doc(db, "decks", deckId);
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

/* ---------------- Cards ---------------- */
// Add a card (now supports keywords, date, contentClasses, etc.)
export async function addCard(deckId, payload = {}) {
  const cardsRef = collection(db, "decks", deckId, "cards");
  const { keywords, ...rest } = payload;

  const docData = {
    deckId,
    ...rest,                       // title, content, json, date, contentClasses, etc.
    keywords: sanitizeKeywords(keywords),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(cardsRef, docData);
  return docRef.id;
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

// decks/{deckId}/cards/{cardId} — update (also sanitizes keywords if provided)
export async function updateCard(deckId, cardId, updates = {}) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);
  const { keywords, ...rest } = updates;

  const data = {
    ...rest,
    ...(keywords !== undefined ? { keywords: sanitizeKeywords(keywords) } : {}),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(cardRef, data);
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
