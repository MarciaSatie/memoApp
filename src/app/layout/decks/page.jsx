"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DecksPage() {
    const params = useSearchParams();
    const selDeck = params.get("deck") || null;
    const [selectedselDeck, setSelectedselDeck] = useState(selDeck);
    useEffect(() => {
        setSelectedselDeck(selDeck);
    }, [selDeck]);

    return(
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Decks Page - {selectedselDeck}</h1>
                <p className="mt-2 text-sm text-neutral-400">
                        {selDeck ? `Selected deck: ${selDeck}` : "No deck selected"}
                </p>
            </div>
    )

}