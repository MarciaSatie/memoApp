// src/components/cards/SearchCards.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * SearchCards
 * Props:
 * - cards: Array<{ id?, title?, summary?, keywords?: string[] }>
 * - onSelect?: (card) => void
 * - remoteSearch?: (query: string) => Promise<Card[]>   // optional (Firestore later)
 * - initialQuery?: string
 * - placeholder?: string
 * - className?: string
 * - debounceMs?: number (default 200)
 * - minChars?: number (default 1)
 * - maxResults?: number (default 50)
 */
export default function SearchCards({
  cards = [],
  onSelect,
  remoteSearch,           // when provided + query length >= minChars, we call it
  initialQuery = "",
  placeholder = "Search cards by title or keywords…",
  className = "",
  debounceMs = 200,
  minChars = 1,
  maxResults = 50,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // [{ card, score, hits }]
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  // Normalize and token helpers
  const norm = useCallback((s) => (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
  , []);

  const tokenize = useCallback((s) => {
    return norm(s)
      .split(/[\s,;]+/g)
      .filter(Boolean);
  }, [norm]);

  const buildRegex = useCallback((tokens) => {
    if (!tokens.length) return null;
    const escaped = tokens.map(t => escapeRegExp(t));
    return new RegExp(`(${escaped.join("|")})`, "gi");
  }, []);

  // Debounced query
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  // Perform search when query/cards change
  useEffect(() => {
    let cancelled = false;

    const doClientSearch = () => {
      const q = debouncedQuery.trim();
      if (q.length < minChars) {
        setResults([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      const toks = tokenize(q);
      const rx = buildRegex(toks);

      const scored = [];
      for (const c of cards) {
        if (!c || typeof c !== "object") continue;

        const t = norm(c.title);
        const s = norm(c.summary);
        const kws = Array.isArray(c.keywords) ? c.keywords.map(norm) : [];

        // Require ALL tokens to appear in ANY field (AND logic)
        const haystack = [t, s, ...kws].join(" ");
        const allPresent = toks.every(tok => haystack.includes(tok));
        if (!allPresent) continue;

        // Simple scoring: title exact > title token > keyword > summary
        let score = 0;
        if (t) {
          if (t === norm(debouncedQuery)) score += 100;
          for (const tok of toks) {
            if (t.startsWith(tok)) score += 20;
            if (t.includes(tok)) score += 10;
          }
        }
        for (const kw of kws) {
          for (const tok of toks) {
            if (kw === tok) score += 15;
            else if (kw.includes(tok)) score += 8;
          }
        }
        if (s) {
          for (const tok of toks) {
            if (s.includes(tok)) score += 2;
          }
        }

        // Build highlights for UI
        scored.push({
          card: c,
          score,
          hits: {
            title: rx ? highlightParts(c.title ?? "", rx) : null,
            summary: rx ? highlightParts(c.summary ?? "", rx) : null,
            keywords: Array.isArray(c.keywords)
              ? c.keywords.map((kw) => (rx ? highlightParts(kw, rx) : null))
              : [],
          },
        });
      }

      scored.sort((a, b) => b.score - a.score);
      const limited = scored.slice(0, maxResults);
      if (!cancelled) {
        setResults(limited);
        setActiveIndex(limited.length ? 0 : -1);
        setLoading(false);
        setError("");
      }
    };

    const doRemoteSearch = async () => {
      const q = debouncedQuery.trim();
      if (q.length < minChars) {
        setResults([]);
        setLoading(false);
        setError("");
        return;
      }
      try {
        setLoading(true);
        setError("");
        const remote = await remoteSearch(q);
        // Reuse client highlight for display
        const toks = tokenize(q);
        const rx = buildRegex(toks);

        const mapped = (Array.isArray(remote) ? remote : []).map((c) => ({
          card: c,
          score: 0, // server decided order
          hits: {
            title: rx ? highlightParts(c?.title ?? "", rx) : null,
            summary: rx ? highlightParts(c?.summary ?? "", rx) : null,
            keywords: Array.isArray(c?.keywords)
              ? c.keywords.map((kw) => (rx ? highlightParts(kw, rx) : null))
              : [],
          },
        }));
        if (!cancelled) {
          setResults(mapped.slice(0, maxResults));
          setActiveIndex(mapped.length ? 0 : -1);
        }
      } catch (e) {
        if (!cancelled) setError("Search failed. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (typeof remoteSearch === "function") doRemoteSearch();
    else doClientSearch();

    return () => { cancelled = true; };
  }, [cards, debouncedQuery, minChars, maxResults, tokenize, norm, buildRegex, remoteSearch]);

  // Keyboard nav
  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = results[activeIndex]?.card;
      sel && onSelect?.(sel);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Input */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-neutral-600 bg-neutral-800 text-white px-10 py-2 outline-none focus:border-neutral-400"
          aria-label="Search cards"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          🔎
        </span>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-700"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {/* Meta */}
      <div className="mt-2 text-xs text-neutral-400 flex items-center gap-3">
        {loading ? <span>Searching…</span> : <span>{results.length} results</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>

      {/* Results */}
      {query.trim().length >= minChars && (
        <ul className="mt-3 divide-y divide-neutral-700 rounded-lg border border-neutral-700 overflow-hidden">
          {results.length === 0 && !loading ? (
            <li className="p-4 text-sm text-neutral-300">No matches.</li>
          ) : (
            results.map((r, idx) => {
              const c = r.card || {};
              const isActive = idx === activeIndex;
              return (
                <li
                  key={c.id ?? `${c.title ?? "untitled"}__${idx}`}
                  className={`p-3 hover:bg-neutral-800/60 cursor-pointer ${isActive ? "bg-neutral-800/80" : ""}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onSelect?.(c)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">
                        {renderHighlighted(r.hits.title, c.title ?? "Untitled")}
                      </div>
                      {c.summary ? (
                        <div className="mt-1 text-sm text-neutral-300 line-clamp-2">
                          {renderHighlighted(r.hits.summary, c.summary)}
                        </div>
                      ) : null}
                      {Array.isArray(c.keywords) && c.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.keywords.map((kw, kidx) => (
                            <span
                              key={`${kw}-${kidx}`}
                              className="rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300"
                            >
                              {renderHighlighted(r.hits.keywords?.[kidx], kw)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500 shrink-0">
                      {r.score ? `score ${r.score}` : ""}
                    </span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function useDebouncedValue(value, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split text into [{text, match:boolean}] parts using regex
 */
function highlightParts(text, rx) {
  if (!text) return [{ text: "", match: false }];
  const out = [];
  let last = 0;
  text.replace(rx, (m, _g1, offset) => {
    if (last < offset) out.push({ text: text.slice(last, offset), match: false });
    out.push({ text: m, match: true });
    last = offset + m.length;
    return m;
  });
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

function renderHighlighted(parts, fallback) {
  if (!parts) return fallback;
  return parts.map((p, i) =>
    p.match ? (
      <mark key={i} className="bg-yellow-400/30 text-inherit rounded-sm px-0.5">
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}
