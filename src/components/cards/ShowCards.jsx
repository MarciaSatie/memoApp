// src/components/cards/ShowCards.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Modal from "@/components/layout/Modal";
import AddCard from "@/components/cards/AddCard";
import {
  getDeckByIdCached,
  getCardsByDeckCached,       // root (no subdeck)
  getSubdecksCached,         // list of subdecks
  getCardsBySubdeckCached,   // cards for a subdeck
} from "@/data/card";
import OverlapCarousel from "@/components/layout/OverlapCarousel";
import Card from "./Card";
import RefreshBTN from "../layout/RefreshBTN";
import SearchCards from "../searchCards/SearchCards";

export default function ShowCards({ deck }) {
  // ✅ Normalize: accept either a deck id string or a deck object
  const deckId = typeof deck === "string" ? deck : deck?.id ?? null;

  // UI state
  const [open, setOpen] = useState(false);                 // "Add card" modal (root)
  const [carouselLocked, setCarouselLocked] = useState(false); // disable drag/keys while any modal is open

  // Data
  const [deckInfo, setDeckInfo] = useState(null);

  // Root cards (no subdeck)
  const [rootCards, setRootCards] = useState([]);

  // Subdecks + their cards
  const [subdecks, setSubdecks] = useState([]);                  // [{id, name, ...}]
  const [subdeckCards, setSubdeckCards] = useState({});          // { [subdeckId]: Card[] }

  // Re-fetch trigger after add/edit/delete
  const [refreshKey, setRefreshKey] = useState(0);

  // Root carousel jump-to
  const [carouselKey, setCarouselKey] = useState(0);
  const [initialIndex, setInitialIndex] = useState(0);
  const carouselAnchorRef = useRef(null);

  // Deck info (cache-first)
  useEffect(() => {
    if (!deckId) return setDeckInfo(null);
    let cancelled = false;
    (async () => {
      try {
        const d = await getDeckByIdCached(deckId);
        if (!cancelled) setDeckInfo(d);
      } catch (err) {
        console.error("Failed to load deck:", err);
        if (!cancelled) setDeckInfo(null);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  // Root cards (cache-first)
  useEffect(() => {
    if (!deckId) return setRootCards([]);
    let cancelled = false;
    (async () => {
      try {
        const list = await getCardsByDeckCached(deckId);
        if (!cancelled) setRootCards(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load root cards:", err);
        if (!cancelled) setRootCards([]);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId, refreshKey]);

  // Subdecks + their cards (cache-first)
  useEffect(() => {
    if (!deckId) {
      setSubdecks([]);
      setSubdeckCards({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const subs = await getSubdecksCached(deckId);
        if (cancelled) return;
        const list = Array.isArray(subs) ? subs : [];
        setSubdecks(list);

        // Load each subdeck's cards in parallel
        const pairs = await Promise.all(
          list.map(async (sd) => {
            try {
              const cards = await getCardsBySubdeckCached(deckId, sd.id);
              return [sd.id, Array.isArray(cards) ? cards : []];
            } catch {
              return [sd.id, []];
            }
          })
        );
        if (!cancelled) setSubdeckCards(Object.fromEntries(pairs));
      } catch (err) {
        console.error("Failed to load subdecks/cards:", err);
        if (!cancelled) {
          setSubdecks([]);
          setSubdeckCards({});
        }
      }
    })();
    return () => { cancelled = true; };
  }, [deckId, refreshKey]);

  const handleCloseAddModal = () => {
    setOpen(false);
    setRefreshKey((k) => k + 1); // refresh lists
  };

  // All cards (root + subdecks) for the search component
  const allCardsForSearch = useMemo(() => {
    const subCards = subdecks.flatMap((sd) => subdeckCards[sd.id] || []);
    return [...rootCards, ...subCards];
  }, [rootCards, subdecks, subdeckCards]);

  // Search -> jump to card in the root carousel *if it’s a root card*.
  // (You can extend this to auto-scroll to the subdeck section if found there.)
  const handleSelect = useCallback((selected) => {
    if (!selected) return;
    const idx = rootCards.findIndex((c) => c?.id && c.id === selected.id);
    if (idx >= 0) {
      setInitialIndex(idx);
      setCarouselKey((k) => k + 1);
      requestAnimationFrame(() => {
        carouselAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      // Optionally: locate its subdeck and scroll to that section
      const found = subdecks.find((sd) =>
        (subdeckCards[sd.id] || []).some((c) => c.id === selected.id)
      );
      if (found) {
        const el = document.getElementById(`subdeck-${found.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [rootCards, subdecks, subdeckCards]);

  // Render a card tile (shared by all carousels)
  const renderCardTile = useCallback(
    (item, index, total) => (
      <Card
        key={item.id ?? index}
        deckId={deckId}
        card={item}
        index={index}
        total={total}
        height={440}
        onUpdated={() => setRefreshKey((k) => k + 1)}
        onDeleted={() => setRefreshKey((k) => k + 1)}
        onModalStateChange={setCarouselLocked}
      />
    ),
    [deckId]
  );

  return (
    <>
      {/* Header / Add */}
      <div className="p-4 overflow-auto">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold mb-4">
            {deckInfo?.title ?? "Decks Page"}
          </h1>

          <RefreshBTN
            deckId={deckId}
            onRefreshed={({ deck, cards }) => {
              if (deck) setDeckInfo(deck);
              if (Array.isArray(cards)) setRootCards(cards);
              setRefreshKey((k) => k + 1); // ensure subdecks refresh too
            }}
          />
        </div>


      <button
        onClick={() => {
          setOpen(true);
          setCarouselLocked(true);   // optional: freeze carousel while modal is open
        }}
        disabled={!deckId}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-bd disabled:opacity-50"
      >
        Add Card
      </button>

      <Modal
        open={open}npm run dev
        
        onClose={handleCloseAddModal}
        title="Add a new card"
        closeOnBackdropClick={false}  // ⛔ don't close on outside click
        closeOnEsc={false}            // ⛔ don't close on Esc (optional)
      >
        <div
          // extra safety against any parent click-away in capture phase
        >
          <AddCard deckId={deckId} onClose={handleCloseAddModal} />
        </div>
      </Modal>

      </div>

      {/* Search (root + subdecks) */}
      <div className="px-4">
        <SearchCards cards={allCardsForSearch} onSelect={handleSelect} />
      </div>

      {/* Root cards carousel */}
      <section ref={carouselAnchorRef} className="p-4">
        <h2 className="text-lg font-semibold mb-2">Main Deck</h2>
        {rootCards.length === 0 ? (
          <p className="text-gray-500">No cards in the main deck.</p>
        ) : (
          <OverlapCarousel
            key={carouselKey}
            items={rootCards}
            renderItem={(item, i) => renderCardTile(item, i, rootCards.length)}
            interactionsDisabled={carouselLocked}
            initialIndex={initialIndex}
            overlapStep={200}
            itemWidth={288}
            height={480}
            showArrows
            className="bg-transparent"
          />
        )}
      </section>

      {/* Subdecks: one carousel per subdeck */}
      {subdecks.map((sd) => {
        const list = subdeckCards[sd.id] || [];
        return (
          <section key={sd.id} id={`subdeck-${sd.id}`} className="p-4">
            <h3 className="text-base font-medium mb-2">Subdeck: {sd.name || "Untitled"}</h3>
            {list.length === 0 ? (
              <p className="text-gray-500">No cards in this subdeck.</p>
            ) : (
              <OverlapCarousel
                items={list}
                renderItem={(item, i) => renderCardTile(item, i, list.length)}
                interactionsDisabled={carouselLocked}
                overlapStep={200}
                itemWidth={288}
                height={480}
                showArrows
                className="bg-transparent"
              />
            )}
          </section>
        );
      })}
    </>
  );
}
