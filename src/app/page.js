"use client";
import AuthWidget from "@/components/auth/AuthWidget";
import Header from "./layout/Header";
import SidebarMenu from "./layout/SidebarMenu";
import { useAuth } from "@/app/provider/AuthProvider";
import { useState } from "react";
import DeckQueryPanel from "./layout/DeckQueryPanel";
import { Suspense } from "react";



export default function Home() {
  const { user, loading } = useAuth();
  const loggedIn = !!user;
  const [expanded, setExpanded] = useState(true);


  return (
    <main className="p-6 ">
      {!loading && loggedIn && (
        <div >
          <AuthWidget />
          <Header />
        </div>
      )}
      {!loggedIn && (
        <>
          <Header />
          <AuthWidget />
        </>
      )}



      {!loading && loggedIn && (
        <div className="flex-1 flex gap-4 overflow-hidden">
          <SidebarMenu expanded={expanded} onToggle={() => setExpanded(e => !e)}>
            {/* Right: Cards panel fills remaining space */}
            <section className="flex-1 min-w-0 border border-bd rounded">
              <Suspense fallback={<div className="p-4 text-sm text-neutral-400">Loading deck…</div>}>
                <DeckQueryPanel />
              </Suspense>
            </section>
          </SidebarMenu>

        </div>

      )}
    </main>
  );
}
