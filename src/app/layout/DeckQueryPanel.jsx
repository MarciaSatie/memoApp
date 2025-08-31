import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import AddCard from "@/components/cards/AddCard";

export default function DeckQueryPanel() {
    const [open, setOpen] = useState(false);

    const params = useSearchParams();              // ✅ allowed in Suspense child
    const selDeck = params.get("deck") || null;    // /?deck=ID

    return (
        <div className="p-4">
         {/* Getting params */}
        <h1 className="text-2xl font-bold mb-4">
            Decks Page {selDeck ? `- ${selDeck}` : ""}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
            {selDeck ? `Selected deck: ${selDeck}` : "No deck selected"}
        </p>
        
        {/* Modal for adding a card */}
        <button
            onClick={() => setOpen(true)}
            disabled={!selDeck}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-white hover:bg-fuchsia-600 disabled:opacity-50"
            >
            Add Card
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title="Add a new card">
             <AddCard deckId={selDeck} />
        </Modal>


        
        </div>
    );
    }
