"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function SidebarMenu({ children })
 {
  const [expanded, setExpanded] = useState(true);
  const expandedClasses = "w-72 min-w-40"; 
  const collapsedClasses = "w-0 min-w-0"; 
  const base = "h-screen border-r flex flex-col bg-neutral-800 text-white overflow-y-auto transition-width duration-300";
  const width = expanded ? expandedClasses : collapsedClasses;
  
  return (
    
    <div className="flex min-h-screen min-w-screen">
      
      <aside className={`${base} ${width}`}>


        <button
        className="absolute m-1 mt-2 z-10 h-8 w-8 rounded-full border border-neutral-600 
                  bg-neutral-700 hover:bg-neutral-600 grid place-items-center shadow"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      </aside>

      {/* main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
