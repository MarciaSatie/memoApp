"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/provider/AuthProvider";
import { getUserDecksCached, deleteDeck,toggleFavorite} from "@/data/decks";
import { Pencil, Trash2, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import UpdateDeck from "./UpdateDeck";

export default function ShowDecks() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(null);
  const router = useRouter();


  const handleDelete = async (e, deck) => {
    //e-> event object (the click event)
    //deck -> the deck object to be deleted
    e.stopPropagation();
    try {
      await deleteDeck(deck.id);                          // Firestore delete
      setDecks(prev => prev.filter(d => d.id !== deck.id)); // Optimistic UI
    } catch (err) {
      console.error(err);
      setMsg(`Delete failed: ${err.message}`);
    }
  };

  const handleUpdate =(e,deck)=>{ 
    e.stopPropagation();
    setShow(prev => prev===deck.id? null:deck.id);
  };

  const handleFavorite = async (e, deck) => {
    e.stopPropagation();  
    try {
      await toggleFavorite(deck);          // Firestore update
      setDecks(prev => prev.map(d => d.id === deck.id ? { ...d, isFavorite: !d.isFavorite } : d)); // Optimistic UI
    } catch (err) {
      console.error(err);
    }
  };
    

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const load = async () => {
      try {
        const list = await getUserDecksCached(user.uid); // cache-first
        if (isMounted) setDecks(list);
      } catch (err) {
        console.error(err);
        if (isMounted) console.log(`Failed to load decks: ${err.message}`);
      }
    };

    load();

    return () => { isMounted = false; };
  }, [user]); // ← run when user changes

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">ShowDecks</h2>

      {msg && <p className="text-sm text-greyTxt mb-2">{msg}</p>}

      {decks.length === 0 ? (
        <p className="text-sm text-greyTxt">No decks yet.</p>
      ) : (
        decks.map((deck) => {
            return (
            <div key={deck.id}
                onClick={() => router.push(`/?deck=${deck.id}`)}
                className="mb-2"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push(`/?deck=${deck.id}`)}
                >
              <div className="flex items-center justify-between mb-2 p-2 border border-bd rounded hover:bg-neutral-700 cursor-pointer">
                  <h3 className="text-lg font-semibold">{deck.title}</h3>

                  <div className="flex items-center gap-2 pl-3 ">
                  <button
                      onClick={(e) => handleFavorite(e, deck)}
                      className="p-1.5 rounded hover:bg-neutral-600"
                      aria-label="Favorite deck"
                      title="Favorite deck"
                  >
                    <Star
                      size={16}
                      className={
                        deck.isFavorite
                          ? "!stroke-yellow-400 !fill-yellow-400"
                          : "!stroke-neutral-400 !fill-none"
                      }
                    />

                  </button>

                  <button
                      onClick={(e) => handleUpdate(e, deck)}
                      className="p-1.5 rounded hover:bg-neutral-600"
                      aria-label="Edit deck"
                      title="Edit deck"
                      aria-expanded={show ===deck.id}
                      aria-controls={`update-${deck.id}`}
                  >
                      <Pencil size={16} />
                  </button>

                  <button
                      onClick={(e) => handleDelete(e, deck)}
                      className="p-1.5 rounded hover:bg-neutral-600 text-red-300 hover:text-red-200"
                      aria-label="Delete deck"
                      title="Delete deck"
                  >
                      <Trash2 size={16} />
                  </button>
                  </div>
              </div>
              {show === deck.id &&(
                <div id={`update-${deck.id}`} className="mb-4">
                  <UpdateDeck deck = {deck} />
                </div>
              )}
            </div>
            );
        })
      )}



    </div>
  );
}
