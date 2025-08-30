import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/firebase";
import { doc, setDoc } from "firebase/firestore";

//Helper Function to create a new deck in Firestore
export async function createDeck({ userId, title, theme, isFavorite = false }) {
    const docRef = doc(collection(db, "decks"));
    await setDoc(docRef, { id: docRef.id, userId, title, theme, isFavorite, createdAt: serverTimestamp() });
    
    return { id: docRef.id };
}