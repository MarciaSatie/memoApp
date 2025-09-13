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
 *
 * Notes:
 * - Two checkboxes let you choose which fields to search: Title and/or Keywords.
 * - Summary is NOT searched anymore (kept for display only).
 */
export default function SearchCards({
  cards = [],
  onSelect,
  remoteSearch,
  initialQuery = "",
  placeholder = "Search cards…",
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

  // NEW: which fields to search
  const [searchTitle, setSearchTitle] = useState(true);
  const [searchKeywords, setSearchKeywords] = useState(true);

  const ensureAtLeastOne = useCallback((nextTitle, nextKeywords) => {
    // Prevent both from being unchecked
    if (!nextTitle && !nextKeywords) {
      return { title: true, keywords: false }; // default back to title
    }
    return { title: nextTitle, keywords: nextKeywords };
  }, []);

  const toggleTitle = () => {
    const next = ensureAtLeastOne(!searchTitle, searchKeywords);
    setSearchTitle(next.title);
    setSearchKeywords(next.keywords);
  };
  const toggleKeywords = () => {
    const next = ensureAtLeastOne(searchTitle, !searchKeywords);
    setSearchTitle(next.title);
    setSearchKeywords(next.keywords);
  };

  // Normalize helpers
  const norm = useCallback(
    (s) =>
      (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase(),
    []
  );

  const tokenize = useCallback(
    (s) => norm(s).split(/[\s,;]+/g).filter(Boolean),
    [norm]
  );

  const buildRegex = useCallback((tokens) => {
    if (!tokens.length) return null;
    const escaped = tokens.map((t) => escapeRegExp(t));
    return new RegExp(`(${escaped.join("|")})`, "gi");
  }, []);

  // Debounced query
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  // Perform search when query/cards/toggles change
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
        const kws = Array.isArray(c.keywords) ? c.keywords.map(norm) : [];

        // Build haystack from selected fields only
        const hayParts = [];
        if (searchTitle) hayParts.push(t);
        if (searchKeywords) hayParts.push(...kws);
        const haystack = hayParts.join(" ");

        // Require ALL tokens (AND) to appear in the selected fields
        const allPresent = toks.every((tok) => haystack.includes(tok));
        if (!allPresent) continue;

        // Scoring: Title (if enabled) stronger than Keywords (if enabled)
        let score = 0;
        if (searchTitle && t) {
          if (t === norm(debouncedQuery)) score += 100;
          for (const tok of toks) {
            if (t.startsWith(tok)) score += 20;
            if (t.includes(tok)) score += 10;
          }
        }
        if (searchKeywords && kws.length) {
          for (const kw of kws) {
            for (const tok of toks) {
              if (kw === tok) score += 15;
              else if (kw.includes(tok)) score += 8;
            }
          }
        }

        // Build highlights for UI (only for selected fields)
        scored.push({
          card: c,
          score,
          hits: {
            title: searchTitle && rx ? highlightParts(c.title ?? "", rx) : null,
            // keep summary ONLY for display; we don't highlight it because we don't search it
            summary: null,
            keywords:
              searchKeywords && Array.isArray(c.keywords)
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
        const toks = tokenize(q);
        const rx = buildRegex(toks);

        // Client-side filter + highlight respecting toggles
        const mapped = (Array.isArray(remote) ? remote : [])
          .map((c) => {
            const t = norm(c?.title);
            const kws = Array.isArray(c?.keywords) ? c.keywords.map(norm) : [];
            const parts = [];
            if (searchTitle) parts.push(t);
            if (searchKeywords) parts.push(...kws);
            const haystack = parts.join(" ");
            const allPresent = toks.every((tok) => haystack.includes(tok));
            if (!allPresent) return null;

            // same scoring as client
            let score = 0;
            if (searchTitle && t) {
              if (t === norm(q)) score += 100;
              for (const tok of toks) {
                if (t.startsWith(tok)) score += 20;
                if (t.includes(tok)) score += 10;
              }
            }
            if (searchKeywords && kws.length) {
              for (const kw of kws) {
                for (const tok of toks) {
                  if (kw === tok) score += 15;
                  else if (kw.includes(tok)) score += 8;
                }
              }
            }

            return {
              card: c,
              score,
              hits: {
                title: searchTitle && rx ? highlightParts(c?.title ?? "", rx) : null,
                summary: null,
                keywords:
                  searchKeywords && Array.isArray(c?.keywords)
                    ? c.keywords.map((kw) => (rx ? highlightParts(kw, rx) : null))
                    : [],
              },
            };
          })
          .filter(Boolean);

        mapped.sort((a, b) => b.score - a.score);
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

    return () => {
      cancelled = true;
    };
  }, [
    cards,
    debouncedQuery,
    minChars,
    maxResults,
    tokenize,
    norm,
    buildRegex,
    remoteSearch,
    searchTitle,
    searchKeywords,
  ]);

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
      {/* NEW: field toggles */}
      <div className="mb-2 flex items-center gap-4 text-sm text-neutral-200">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-neutral-400"
            checked={searchTitle}
            onChange={toggleTitle}
          />
          <span>Title</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-neutral-400"
            checked={searchKeywords}
            onChange={toggleKeywords}
          />
          <span>Keywords</span>
        </label>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            searchTitle && searchKeywords
              ? "Search by title or keywords…"
              : searchTitle
              ? "Search by title…"
              : "Search by keywords…"
          }
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
                      {/* Keep summary for display only (not searched) */}
                      {c.summary ? (
                        <div className="mt-1 text-sm text-neutral-300 line-clamp-2">
                          {c.summary}
                        </div>
                      ) : null}
                      {Array.isArray(c.keywords) && c.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.keywords.map((kw, kidx) => (
                            <span
                              key={`${kw}-${kidx}`}
                              className="rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300"
                            >
                              {renderHighlighted(
                                r.hits.keywords?.[kidx],
                                kw
                              )}
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
