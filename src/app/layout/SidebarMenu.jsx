"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import AddDeck from "@/components/decks/AddDeck";
import ShowDecks from "@/components/decks/ShowDecks";
import { useState, useEffect } from "react";

export default function SidebarMenu({ children, expanded, onToggle }) {

  const [isMinScreen, setIsMinScreen] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)"); // sm breakpoint
    const handleResize = () => setIsMinScreen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleResize);
    handleResize(); // Set initial value
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  // Sidebar width classes

  // Mobile (default): ~110px. On sm+ keep your old 18rem (w-72) and min-w-40.
  
  const expandedClasses = isMinScreen ? "w-72 min-w-80" : "w-110 min-w-110";
  const collapsedClasses = "w-0 min-w-0";

  const base =
    "h-screen border-r border-bd flex flex-col bg-neutral-800 text-white overflow-y-auto transition-[width] duration-300";
  const width = expanded ? expandedClasses : collapsedClasses;

  return (
    <div className="flex min-h-screen w-full">
      <aside id="app-sidebar" className={`${base} ${width}`}>
        <button
          className="absolute m-1 mt-2 z-10 h-8 w-8 rounded-full border border-bd
                     bg-neutral-700 hover:bg-neutral-600 grid place-items-center shadow"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="app-sidebar"
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="mt-15 p-4 m-5">
          <AddDeck />
          <ShowDecks />
        </div>
      </aside>

      {/* main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
