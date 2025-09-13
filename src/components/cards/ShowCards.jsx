// src/components/cards/ShowCards.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Modal from "@/components/layout/Modal";
import AddCard from "@/components/cards/AddCard";
import { getDeckByIdCached, getCardsByDeckCached } from "@/data/card";
import OverlapCarousel from "@/components/layout/OverlapCarousel";
import Card from "./Card";
import RefreshBTN from "../layout/RefreshBTN";
import SearchCards from "../searchCards/SearchCards";

export default function ShowCards({ deck }) {
  const deckId = deck || null;

  // UI / modal state
  const [open, setOpen] = useState(false); // "Add card" modal
  const [carouselLocked, setCarouselLocked] = useState(false); // disable carousel while any card modal is open

  // Data
  const [deckInfo, setDeckInfo] = useState(null);
  const [cards, setCards] = useState([]);

  // Re-fetch trigger after adding/editing/deleting
  const [refreshKey, setRefreshKey] = useState(0);

  // Carousel control (jump to selected)
  const [carouselKey, setCarouselKey] = useState(0);
  const [initialIndex, setInitialIndex] = useState(0);
  const carouselAnchorRef = useRef(null);

  // Memoized items
  const items = useMemo(
    () => (Array.isArray(cards) ? cards.filter((c) => c && typeof c === "object") : []),
    [cards]
  );

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
    return () => { cancelled = true; };
  }, [deckId]);

  // Cards (cache-first)
  useEffect(() => {
    if (!deckId) return setCards([]);
    let cancelled = false;
    (async () => {
      try {
        const cardList = await getCardsByDeckCached(deckId);
        if (!cancelled) setCards(Array.isArray(cardList) ? cardList : []);
      } catch (err) {
        console.error("Failed to load cards:", err);
        if (!cancelled) setCards([]);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId, refreshKey]);

  const handleCloseAddModal = () => {
    setOpen(false);
    setRefreshKey((k) => k + 1);
  };

  // ---- Search selection -> jump carousel to that card ----
  const handleSelect = useCallback(
    (selected) => {
      if (!selected) return;
      const idxById = items.findIndex((c) => c?.id && c.id === selected.id);
      const idx =
        idxById >= 0
          ? idxById
          : items.findIndex(
              (c) =>
                c &&
                c.title === selected.title &&
                c.summary === selected.summary
            );
      const target = idx >= 0 ? idx : 0;

      setInitialIndex(target);
      // force a re-mount so initialIndex is applied immediately
      setCarouselKey((k) => k + 1);

      // scroll to carousel
      requestAnimationFrame(() => {
        carouselAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [items]
  );

  // Render each card tile
  const renderItem = useCallback(
    (item, index) => (
      <Card
        key={item.id ?? index}
        deckId={deckId}
        card={item}
        height={440}
        onUpdated={() => setRefreshKey((k) => k + 1)}
        onDeleted={() => setRefreshKey((k) => k + 1)}
        onModalStateChange={setCarouselLocked} // lock carousel while modal open
      />
    ),
    [deckId]
  );

  return (
    <>
      <div className="p-4 overflow-auto">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold mb-4">
            {deckInfo?.title ?? "Decks Page"}
          </h1>

          <RefreshBTN
            deckId={deckId}
            onRefreshed={({ deck, cards }) => {
              if (deck) setDeckInfo(deck);
              if (Array.isArray(cards)) setCards(cards);
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

      <div className="p-4 space-y-4">
        <SearchCards
          cards={items}
          onSelect={handleSelect}
          // remoteSearch={async (q) => { /* Firestore search later */ }}
        />
      </div>

      <div ref={carouselAnchorRef} className="p-4">
        {items.length === 0 ? (
          <p className="text-gray-500">No cards in this deck.</p>
        ) : (
          <OverlapCarousel
            key={`carousel-${carouselKey}-${deckId}`}
            items={items}
            renderItem={renderItem}
            itemWidth={320}
            overlapStep={220}
            height={520}
            showArrows
            initialIndex={initialIndex}
            interactionsDisabled={carouselLocked} // if your OverlapCarousel supports this
            className="bg-neutral-900/80 rounded-2xl border"
          />
        )}
      </div>
    </>
  );
}
