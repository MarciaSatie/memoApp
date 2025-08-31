import { db } from "@/app/firebase";
import {
  collection, doc, setDoc, serverTimestamp,
  query, where, orderBy,
  getDocsFromCache, getDocsFromServer,
  onSnapshot,deleteDoc,updateDoc 
} from "firebase/firestore";

//Helper Function to create a new deck in Firestore
export async function createDeck({ userId, title, theme, isFavorite = false }) {
    const docRef = doc(collection(db, "decks"));
    await setDoc(docRef, { id: docRef.id, userId, title, theme, isFavorite, createdAt: serverTimestamp() });
    
    return { id: docRef.id };
}

//Helper Function to get all decks for a specific user from Firestore
export async function getUserDecksCached(userId) {
    const decksRef = collection(db, "decks");
    const q = query(decksRef, where("userId", "==", userId), orderBy("createdAt", "desc"));

    //get data from cache,IndexedDB only (no network, no cost).
    const cachedSnap = await getDocsFromCache(q);

    if (!cachedSnap.empty) {
        const fromCache = [];

        for (const d of cachedSnap.docs) {
        const data = d.data();              // fields from the doc
        const obj = { id: d.id, ...data };  // merge id + fields
        fromCache.push(obj);                 // add to the result array
        }
        return fromCache;
    } else {
        //if cache is empty, get data from server (network, may cost money).
        const serverSnap = await getDocsFromServer(q);
        const fromServer = [];

        for (const d of serverSnap.docs) {
        const data = d.data();              // fields from the doc
        const obj = { id: d.id, ...data };  // merge id + fields
        fromServer.push(obj);               // add to the result array
        }
        return fromServer;
    }
}

export async function deleteDeck(deckId) {
    if (!deckId) throw new Error("deleteDeck: deckId is required"); 
    await deleteDoc(doc(db, "decks", deckId));
}

export async function updateDeck(deckId, updates) {
    if (!deckId) throw new Error("updateDeck: deckId is required");
    if (!updates || typeof updates !== "object") throw new Error("updateDeck: updates must be an object");  
    const deckRef = doc(db, "decks", deckId);
    await updateDoc(deckRef, updates);
}   