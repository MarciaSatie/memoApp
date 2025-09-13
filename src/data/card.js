// src/data/card.js
import { db } from "@/app/firebase";
import {
  doc, collection, collectionGroup, query, where, orderBy,
  getDoc, addDoc, serverTimestamp, getDocs, writeBatch,
  getDocsFromCache, getDocFromCache, getDocsFromServer, getDocFromServer,
  updateDoc, deleteDoc,
} from "firebase/firestore";

/* ---------------- Helpers ---------------- */
function sanitizeKeywords(input) {
  if (!input) return [];
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
      out.push(s);
    }
  }
  return out;
}

const cardsColRef = (deckId, subdeckId = null) =>
  subdeckId
    ? collection(db, "decks", deckId, "subdecks", subdeckId, "cards")
    : collection(db, "decks", deckId, "cards");

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
  } catch (_) {}
  const server = await getDocFromServer(deckRef);
  if (!server.exists()) throw new Error("Deck not found");
  return { id: server.id, ...server.data() };
}

/* ---------------- Subdecks ---------------- */
export async function addSubdeck(deckId, { name, description = "" }) {
  const subdecksRef = collection(db, "decks", deckId, "subdecks");
  const docRef = await addDoc(subdecksRef, {
    deckId,
    name: String(name || "Untitled").trim(),
    description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getSubdecksCached(deckId) {
  const subdecksRef = collection(db, "decks", deckId, "subdecks");
  const q = query(subdecksRef, orderBy("createdAt", "asc"));

  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  const server = await getDocsFromServer(q);
  return server.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateSubdeck(deckId, subdeckId, updates) {
  const ref = doc(db, "decks", deckId, "subdecks", subdeckId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Delete a subdeck but KEEP its cards:
 * Moves every card from `decks/{deckId}/subdecks/{subdeckId}/cards`
 * into `decks/{deckId}/cards` (root) and sets `subdeckId: null`.
 * Then deletes the subdeck doc.
 */
export async function deleteSubdeck(deckId, subdeckId) {
  if (!deckId || !subdeckId) throw new Error("deleteSubdeck: missing ids");

  const fromRef = collection(db, "decks", deckId, "subdecks", subdeckId, "cards");
  const rootCardsCol = collection(db, "decks", deckId, "cards");

  const snap = await getDocs(fromRef);
  if (!snap.empty) {
    const CHUNK = 200; // 200 cards => ~400 ops per batch (set+delete), safe below 500
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      const slice = snap.docs.slice(i, i + CHUNK);

      slice.forEach((d) => {
        const data = d.data() || {};
        const rootRef = doc(rootCardsCol, d.id); // reuse id
        batch.set(rootRef, {
          ...data,
          subdeckId: null,
          updatedAt: serverTimestamp(),
        });
        batch.delete(d.ref);
      });

      await batch.commit();
    }
  }

  const subdeckRef = doc(db, "decks", deckId, "subdecks", subdeckId);
  await deleteDoc(subdeckRef);
}

/* ---------------- Cards (root-level, backward compatible) ---------------- */
export async function addCard(deckId, payload = {}) {
  const { keywords, ...rest } = payload;
  const cardsRef = cardsColRef(deckId, null);
  const docRef = await addDoc(cardsRef, {
    deckId,
    subdeckId: null,
    ...rest,
    keywords: sanitizeKeywords(keywords),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCardsByDeckCached(deckId) {
  const cardsRef = cardsColRef(deckId, null);
  const q = query(cardsRef, orderBy("createdAt", "desc"));

  try {
    const cachedSnap = await getDocsFromCache(q);
    if (!cachedSnap.empty) return cachedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  const serverSnap = await getDocsFromServer(q);
  return serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateCard(deckId, cardId, updates = {}) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);
  const { keywords, ...rest } = updates;
  await updateDoc(cardRef, {
    ...rest,
    ...(keywords !== undefined ? { keywords: sanitizeKeywords(keywords) } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCard(deckId, cardId) {
  const cardRef = doc(db, "decks", deckId, "cards", cardId);
  await deleteDoc(cardRef);
}

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
  } catch (_) {}
  const server = await getDocFromServer(cardRef);
  if (!server.exists()) throw new Error("Card not found");
  return { id: server.id, ...server.data() };
}

/* ---------------- Cards (in a subdeck) ---------------- */
export async function addCardToSubdeck(deckId, subdeckId, payload = {}) {
  const { keywords, ...rest } = payload;
  const cardsRef = cardsColRef(deckId, subdeckId);
  const docRef = await addDoc(cardsRef, {
    deckId,
    subdeckId,
    ...rest,
    keywords: sanitizeKeywords(keywords),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCardsBySubdeckCached(deckId, subdeckId) {
  const cardsRef = cardsColRef(deckId, subdeckId);
  const q = query(cardsRef, orderBy("createdAt", "desc"));

  try {
    const cachedSnap = await getDocsFromCache(q);
    if (!cachedSnap.empty) return cachedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  const serverSnap = await getDocsFromServer(q);
  return serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateCardInSubdeck(deckId, subdeckId, cardId, updates = {}) {
  const cardRef = doc(db, "decks", deckId, "subdecks", subdeckId, "cards", cardId);
  const { keywords, ...rest } = updates;
  await updateDoc(cardRef, {
    ...rest,
    ...(keywords !== undefined ? { keywords: sanitizeKeywords(keywords) } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCardInSubdeck(deckId, subdeckId, cardId) {
  const cardRef = doc(db, "decks", deckId, "subdecks", subdeckId, "cards", cardId);
  await deleteDoc(cardRef);
}

/* ---------------- Collection-group helpers (optional) ---------------- */
export async function getAllCardsForDeck(deckId) {
  const q = query(
    collectionGroup(db, "cards"),
    where("deckId", "==", deckId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllCardsForDeckCached(deckId) {
  const q = query(
    collectionGroup(db, "cards"),
    where("deckId", "==", deckId),
    orderBy("createdAt", "desc")
  );
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {}
  const server = await getDocsFromServer(q);
  return server.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function searchDeckCardsByKeywords(deckId, tokens = []) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  const q = query(
    collectionGroup(db, "cards"),
    where("deckId", "==", deckId),
    where("keywords", "array-contains-any", tokens.slice(0, 10)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
