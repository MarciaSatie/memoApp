// src/data/decks.js
import { db } from "@/app/firebase";
import {
  collection, doc, setDoc, serverTimestamp,
  query, where, orderBy,
  getDocsFromCache, getDocsFromServer,
  getDocFromCache, getDocFromServer, getDocs,
  updateDoc, deleteDoc, writeBatch,
} from "firebase/firestore";

/* ───────────────────────────── Decks ───────────────────────────── */

export async function createDeck({ userId, title, theme, isFavorite = false }) {
  const docRef = doc(collection(db, "decks"));
  await setDoc(docRef, {
    id: docRef.id,
    userId,
    title,
    theme,
    isFavorite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

export async function getUserDecksCached(userId) {
  const decksRef = collection(db, "decks");
  const q = query(decksRef, where("userId", "==", userId), orderBy("createdAt", "desc"));

  try {
    const cachedSnap = await getDocsFromCache(q);
    if (!cachedSnap.empty) {
      return cachedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (_) { /* cache miss is fine */ }

  const serverSnap = await getDocsFromServer(q);
  return serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDeckByIdCached(deckId) {
  const deckRef = doc(db, "decks", deckId);
  try {
    const cached = await getDocFromCache(deckRef);
    if (cached.exists()) return { id: cached.id, ...cached.data() };
  } catch (_) { /* cache miss is fine */ }

  const server = await getDocFromServer(deckRef);
  if (!server.exists()) throw new Error("Deck not found");
  return { id: server.id, ...server.data() };
}

export async function updateDeck(deckId, updates) {
  if (!deckId) throw new Error("updateDeck: deckId is required");
  if (!updates || typeof updates !== "object") {
    throw new Error("updateDeck: updates must be an object");
  }
  const deckRef = doc(db, "decks", deckId);
  await updateDoc(deckRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function toggleFavorite(deck) {
  await updateDeck(deck.id, { isFavorite: !deck.isFavorite });
}

export async function deleteDeck(deckId) {
  if (!deckId) throw new Error("deleteDeck: deckId is required");
  await deleteDoc(doc(db, "decks", deckId));
}

/* ─────────────────────────── Subdecks API ─────────────────────────── */

const subdecksRef = (deckId) => collection(db, "decks", deckId, "subdecks");
const rootCardsRef = (deckId) => collection(db, "decks", deckId, "cards");
const subdeckCardsRef = (deckId, subdeckId) =>
  collection(db, "decks", deckId, "subdecks", subdeckId, "cards");

export async function getSubdecksCached(deckId) {
  const q = query(subdecksRef(deckId), orderBy("createdAt", "asc"));

  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) { /* cache miss ok */ }

  const server = await getDocsFromServer(q);
  return server.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addSubdeck(deckId, { name, description = "" }) {
  const ref = doc(subdecksRef(deckId)); // auto-id
  await setDoc(ref, {
    deckId,
    name: String(name || "Untitled").trim(),
    description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSubdeck(deckId, subdeckId, updates = {}) {
  const ref = doc(db, "decks", deckId, "subdecks", subdeckId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Move ALL cards from a subdeck to the main deck (root cards collection).
 * Preserves document IDs when possible.
 * Chunked to respect the 500-write batch limit.
 */
export async function moveSubdeckCardsToRoot(deckId, subdeckId) {
  const snap = await getDocs(subdeckCardsRef(deckId, subdeckId));
  if (snap.empty) return 0;

  const docs = snap.docs;
  const chunks = chunk(docs, 450); // headroom for safety

  let moved = 0;
  for (const group of chunks) {
    const batch = writeBatch(db);
    for (const d of group) {
      const data = d.data();
      // Keep same ID in the root; overwrite if a conflict somehow exists.
      const dst = doc(rootCardsRef(deckId), d.id);
      batch.set(dst, {
        ...data,
        subdeckId: null,
        updatedAt: serverTimestamp(),
      });
      batch.delete(d.ref);
      moved++;
    }
    await batch.commit();
  }
  return moved;
}

/**
 * Delete a subdeck and ALL its cards permanently (cascade).
 * If you'd rather keep the cards, call moveSubdeckCardsToRoot first, then this.
 */
export async function deleteSubdeck(deckId, subdeckId) {
  const snap = await getDocs(subdeckCardsRef(deckId, subdeckId));
  const chunks = chunk(snap.docs, 450);

  for (const group of chunks) {
    const batch = writeBatch(db);
    group.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await deleteDoc(doc(db, "decks", deckId, "subdecks", subdeckId));
}

/**
 * Delete a subdeck BUT keep cards by moving them to the main deck first.
 */
export async function deleteSubdeckMovingCardsToRoot(deckId, subdeckId) {
  await moveSubdeckCardsToRoot(deckId, subdeckId);
  await deleteDoc(doc(db, "decks", deckId, "subdecks", subdeckId));
}

/**
 * Manage subdecks (create / update / remove) in a single batch.
 * NOTE: remove here only deletes subdeck docs; it does NOT cascade cards.
 * If you need to keep cards, call deleteSubdeckMovingCardsToRoot per subdeck first.
 *
 * ops = {
 *   create: [{ name, description? }],
 *   update: [{ id, name?, description? }],
 *   remove: [id, id, ...]
 * }
 */
export async function manageSubdecks(deckId, ops = {}) {
  const { create = [], update = [], remove = [] } = ops;

  const batch = writeBatch(db);
  const subRoot = subdecksRef(deckId);

  const created = [];
  const updated = [];
  const removed = [];

  for (const raw of create) {
    const data = {
      deckId,
      name: String(raw?.name || "Untitled").trim(),
      description: String(raw?.description || ""),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = doc(subRoot);
    batch.set(ref, data);
    created.push({ id: ref.id, data });
  }

  for (const raw of update) {
    if (!raw?.id) continue;
    const ref = doc(db, "decks", deckId, "subdecks", raw.id);
    const data = {
      ...(raw.name !== undefined ? { name: String(raw.name).trim() } : {}),
      ...(raw.description !== undefined ? { description: String(raw.description) } : {}),
      updatedAt: serverTimestamp(),
    };
    batch.update(ref, data);
    updated.push(raw.id);
  }

  for (const id of remove) {
    if (!id) continue;
    const ref = doc(db, "decks", deckId, "subdecks", id);
    batch.delete(ref);
    removed.push(id);
  }

  await batch.commit();
  return { created, updated, removed };
}

/**
 * Update deck fields AND manage subdecks in a single batch.
 * (No cascade on remove; move or delete cards explicitly before calling if needed.)
 *
 * payload = {
 *   deck: { title?, theme?, isFavorite?, ... },
 *   subdecks: {
 *     create: [{ name, description? }],
 *     update: [{ id, name?, description? }],
 *     remove: [id, id, ...]
 *   }
 * }
 */
export async function updateDeckAndSubdecks(deckId, payload = {}) {
  const { deck = {}, subdecks = {} } = payload;

  const batch = writeBatch(db);
  const deckRef = doc(db, "decks", deckId);
  const subRoot = subdecksRef(deckId);

  // deck fields
  batch.update(deckRef, { ...deck, updatedAt: serverTimestamp() });

  const created = [];
  const updated = [];
  const removed = [];

  for (const raw of subdecks.create ?? []) {
    const data = {
      deckId,
      name: String(raw?.name || "Untitled").trim(),
      description: String(raw?.description || ""),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = doc(subRoot);
    batch.set(ref, data);
    created.push({ id: ref.id, data });
  }

  for (const raw of subdecks.update ?? []) {
    if (!raw?.id) continue;
    const ref = doc(db, "decks", deckId, "subdecks", raw.id);
    const data = {
      ...(raw.name !== undefined ? { name: String(raw.name).trim() } : {}),
      ...(raw.description !== undefined ? { description: String(raw.description) } : {}),
      updatedAt: serverTimestamp(),
    };
    batch.update(ref, data);
    updated.push(raw.id);
  }

  for (const id of subdecks.remove ?? []) {
    if (!id) continue;
    const ref = doc(db, "decks", deckId, "subdecks", id);
    batch.delete(ref);
    removed.push(id);
  }

  await batch.commit();
  return { created, updated, removed };
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
