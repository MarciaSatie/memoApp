"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/layout/Modal";
import AddCard from "@/components/cards/AddCard";
import { getDeckByIdCached, getCardsByDeckCached } from "@/data/card";
import OverlapCarousel from "@/components/layout/OverlapCarousel";

export default function ShowCards({ deck }) {
  const [open, setOpen] = useState(false);
  const selDeck = deck || null;
  const [deckInfo, setDeckInfo] = useState(null);
  const [cards, setCards] = useState([]);

  // re-fetch trigger after closing Add modal
  const [refreshKey, setRefreshKey] = useState(0);

  // Deck info (cache-first)
  useEffect(() => {
    if (!selDeck) return setDeckInfo(null);
    let cancelled = false;
    getDeckByIdCached(selDeck)
      .then((d) => !cancelled && setDeckInfo(d))
      .catch((err) => {
        console.error("Failed to load deck:", err);
        !cancelled && setDeckInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selDeck]);

  // Cards (cache-first)
  useEffect(() => {
    if (!selDeck) return setCards([]);
    let cancelled = false;
    (async () => {
      try {
        const cardList = await getCardsByDeckCached(selDeck);
        if (!cancelled) setCards(cardList);
      } catch (err) {
        console.error("Failed to load cards:", err);
        if (!cancelled) setCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selDeck, refreshKey]);

  const handleCloseAddModal = () => {
    setOpen(false);
    setRefreshKey((k) => k + 1); // refresh list after adding
  };

  // how each card tile looks in the carousel
  const renderItem = (item) => (
    <div className="p-4 bg-white rounded-2xl shadow border h-[440px] overflow-hidden">
      <h2 className="text-lg text-primary font-semibold mb-2 line-clamp-2">
        {item.title || "Untitled"}
      </h2>
      <div
        className="text-greyTxt prose prose-sm max-w-none tiptap-content h-[360px] overflow-auto"
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />
    </div>
  );

  const getZIndex = (_item, index) => cards.length - index;

  return (
    <>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">
          {deckInfo?.title ?? "Decks Page"}
        </h1>

        <button
          onClick={() => setOpen(true)}
          disabled={!selDeck}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-white hover:bg-bd disabled:opacity-50"
        >
          Add Card
        </button>

        <Modal open={open} onClose={handleCloseAddModal} title="Add a new card">
          <AddCard deckId={selDeck} />
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
            getZIndex={getZIndex}
            className="bg-neutral-900/80 rounded-2xl border"
          />
        )}
      </div>
    </>
  );
}
