"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/layout/Modal";
import AddCard from "@/components/cards/AddCard";
import { getDeckByIdCached, getCardsByDeckCached } from "@/data/card";
import OverlapCarousel from "@/components/layout/OverlapCarousel";
import Card from "./Card";
import RefreshBTN from "../layout/RefreshBTN";

export default function ShowCards({ deck }) {
  const [open, setOpen] = useState(false);
  const deckId = deck || null;
  const [deckInfo, setDeckInfo] = useState(null);
  const [cards, setCards] = useState([]);

  
  // re-fetch trigger after closing Add modal
  const [refreshKey, setRefreshKey] = useState(0);

  // Deck info (cache-first)
  useEffect(() => {
    if (!deckId) return setDeckInfo(null);
    let cancelled = false;
    getDeckByIdCached(deckId)
      .then((d) => !cancelled && setDeckInfo(d))
      .catch((err) => {
        console.error("Failed to load deck:", err);
        !cancelled && setDeckInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Cards (cache-first)
  useEffect(() => {
    if (!deckId) return setCards([]);
    let cancelled = false;
    (async () => {
      try {
        const cardList = await getCardsByDeckCached(deckId);
        if (!cancelled) setCards(cardList);
      } catch (err) {
        console.error("Failed to load cards:", err);
        if (!cancelled) setCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, refreshKey]);

  const handleCloseAddModal = () => {
    setOpen(false);
    setRefreshKey((k) => k + 1); // refresh list after adding
  };

 const renderItem = (item, index) => (
  <Card
    key={item.id ?? index}
    deckId={deckId}
    card={item}
    height={440}
    onUpdated={() => setRefreshKey(k => k + 1)}
    onDeleted={() => setRefreshKey(k => k + 1)}
  />
);



  return (
    <>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold mb-4">
            {deckInfo?.title ?? "Decks Page"}
          </h1>

            <RefreshBTN
              deckId={deckId}
              onRefreshed={({ deck, cards }) => {
                if (deck) setDeckInfo(deck);
                if (Array.isArray(cards)) setCards(cards);
                // optional: also bump refreshKey if you want to force a re-read elsewhere
                // setRefreshKey(k => k + 1);
              }}
            />
          </div>

        <button
          onClick={() => setOpen(true)}
          disabled={!deckId}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-white hover:bg-bd disabled:opacity-50"
        >
          Add Card
        </button>

        <Modal open={open} onClose={handleCloseAddModal} title="Add a new card">
          <AddCard deckId={deckId} />
        </Modal>
      </div>

      <div className="p-4">
        {cards.length === 0 ? (
          <p className="text-gray-500">No cards in this deck.</p>
        ) : (
          <OverlapCarousel
            items={cards}
            renderItem={renderItem}
            itemWidth={320}
            overlapStep={220}
            height={520}
            showArrows
            enableModal
            getModalTitle={(item) => item.title || "Card Details"}
            renderModalContent={(item) => (
              <div className="space-y-2">
                {item.date && (
                  <div className="text-xs text-gray-500">{item.date}</div>
                )}
                <div
                  className="prose max-w-none tiptap-content"
                  dangerouslySetInnerHTML={{
                    __html: item.content || "<p><em>No content</em></p>",
                  }}
                />
              </div>
            )}
            className="bg-neutral-900/80 rounded-2xl border"
          />
        )}
      </div>
    </>
  );
}
