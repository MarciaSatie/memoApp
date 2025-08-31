"use client";
import AuthWidget from "@/components/auth/AuthWidget";
import Header from "./layout/Header";
import SidebarMenu from "./layout/SidebarMenu";
import { useAuth } from "@/app/provider/AuthProvider";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {
 const { user, loading } = useAuth();
 const loggedIn = !!user;

 const params = useSearchParams();
  const selDeck = params.get("deck") || null;
  const [selectedselDeck, setSelectedselDeck] = useState(selDeck);
  useEffect(() => {
      setSelectedselDeck(selDeck);
  }, [selDeck]);

  return (
    <main className="p-6">
      <Header />
      <AuthWidget />

      {!loading && loggedIn && (
        <>
          <SidebarMenu />
          <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Decks Page - {selectedselDeck}</h1>
                <p className="mt-2 text-sm text-neutral-400">
                        {selDeck ? `Selected deck: ${selDeck}` : "No deck selected"}
                </p>
            </div>
        </>)}

    </main>
  );
}
