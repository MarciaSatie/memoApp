"use client";

import { useState,useEffect } from "react";
import Modal from "@/components/layout/Modal";
import AddCard from "@/components/cards/AddCard";
import {getDeckByIdCached} from "@/data/card";

export default function ShowCards({ deck }) {
  // deck is expected to be a string deckId (e.g., "abc123")
  const [open, setOpen] = useState(false);
  const selDeck = deck || null;
  const [deckInfo,setDeckInfo] = useState(null);

useEffect(() => {
  if (!selDeck) {
    setDeckInfo(null);
    return;
  }

  let cancelled = false;

  getDeckByIdCached(selDeck)
    .then((d) => !cancelled && setDeckInfo(d))
    .catch((err) => {
      console.error("Failed to load deck:", err);
      !cancelled && setDeckInfo(null);
    });

  return () => { cancelled = true; };
}, [selDeck]);



  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4"> {deckInfo?.title ?? "Decks Page"}</h1>

      <button
        onClick={() => setOpen(true)}
        disabled={!selDeck}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-white hover:bg-bd disabled:opacity-50"
      >
        Add Card
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add a new card">
        <AddCard deckId={selDeck} />
      </Modal>
    </div>
  );
}
