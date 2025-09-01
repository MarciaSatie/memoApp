"use client";

import { useSearchParams } from "next/navigation";
import ShowCards from "@/components/cards/ShowCards";

export default function DeckQueryPanel() {
  const params = useSearchParams();
  const selDeck = params.get("deck") || null;

  return (
    <div className="p-4">
      <ShowCards deck={selDeck} />
    </div>
  );
}
