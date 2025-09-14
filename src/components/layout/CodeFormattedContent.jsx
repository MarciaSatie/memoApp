"use client";

import { useEffect, useRef } from "react";

export default function CodeFormattedContent({ className = "", children }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = typeof children === "string" ? children : "";

    (async () => {
      // Load Prettier (best effort)
      let prettier;
      let plugins = [];
      try {
        prettier = (await import("prettier/standalone")).default;
        const [
          pluginBabel,
          pluginHtml,
          pluginTypescript,
          pluginPostcss,
          pluginMarkdown,
          pluginEstree,
        ] = await Promise.all([
          import("prettier/plugins/babel").then((m) => m.default),
          import("prettier/plugins/html").then((m) => m.default),
          import("prettier/plugins/typescript").then((m) => m.default),
          import("prettier/plugins/postcss").then((m) => m.default),
          import("prettier/plugins/markdown").then((m) => m.default),
          import("prettier/plugins/estree").then((m) => m.default),
        ]);
        plugins = [
          pluginBabel,
          pluginHtml,
          pluginTypescript,
          pluginPostcss,
          pluginMarkdown,
          pluginEstree,
        ];
      } catch {
        /* prettier optional */
      }

      // Load Prism + a few languages
      let Prism;
      try {
        Prism = (await import("prismjs")).default || (await import("prismjs"));
        await Promise.all([
          import("prismjs/components/prism-markup"),
          import("prismjs/components/prism-javascript"),
          import("prismjs/components/prism-typescript"),
          import("prismjs/components/prism-json"),
          import("prismjs/components/prism-css"),
          import("prismjs/components/prism-bash"),
          import("prismjs/components/prism-powershell"),
          import("prismjs/components/prism-markdown"),
        ]);
      } catch {
        /* prism optional */
      }

      if (cancelled) return;

      const blocks = host.querySelectorAll("pre > code");
      blocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre) return;

        pre.classList.add("relative");
        pre.querySelectorAll("[data-copy-btn]").forEach((b) => b.remove());

        let raw = codeEl.textContent ?? "";
        const lang = detectLang(codeEl, raw);

        if (lang) {
          codeEl.classList.add(`language-${lang}`);
          pre.classList.add(`language-${lang}`);
        }

        const parser = chooseParser(lang, raw);
        if (prettier && parser && raw.length <= 200_000) {
          try {
            const formatted = prettier.format(raw, { parser, plugins });
            if (formatted && formatted !== raw) {
              raw = formatted.trimEnd() + "\n";
              codeEl.textContent = raw;
            }
          } catch {
            /* ignore formatting errors */
          }
        }

        attachCopy(pre, codeEl);

        if (Prism && typeof Prism.highlightElement === "function") {
          try { Prism.highlightElement(codeEl); } catch {}
        }
      });
    })();

    return () => { cancelled = true; };
  }, [children]);

  return <div ref={hostRef} className={className} />;
}

/* ─── helpers ─── */
function detectLang(codeEl, src = "") {
  const cls = (codeEl.className || "").toLowerCase();
  const attr =
    (codeEl.getAttribute("data-lang") ||
      codeEl.getAttribute("lang") ||
      "").toLowerCase();
  const fromClass =
    cls.match(/(?:language|lang)-([a-z0-9+#]+)/)?.[1] ||
    cls.match(/\b([a-z0-9+#]+)\b/)?.[1] ||
    "";
  const hint = (attr || fromClass || "").toLowerCase();
  const alias = aliasToKnown(hint);
  if (alias) return alias;

  const s = src.trim();
  if (/^#!.*\b(bash|sh|zsh)\b/.test(s)) return "bash";
  if (/^#!.*\b(pwsh|powershell)\b/.test(s)) return "powershell";
  if (/^\$[ \t]/m.test(s)) {
    if (/\b(Get-|Set-|New-|Write-Host|Out-)\w+/.test(s)) return "powershell";
    return "bash";
  }
  if (/\b(Get-|Set-|New-|Write-Host|Out-)\w+/.test(s)) return "powershell";
  if (/^\s*</.test(s)) return "markup";
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) return "json";
  if (/(^|\n)\s*(import|export)\s/m.test(s)) return "javascript";
  if (/^#{1,6}\s/m.test(s) || (/[\S]\s*\|\s*[\S]/.test(s) && /\|/.test(s))) return "markdown";
  return "";
}
function aliasToKnown(lang) {
  const map = {
    html: "markup",
    xml: "markup",
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    md: "markdown",
    sh: "bash",
    zsh: "bash",
    shell: "bash",
    ps: "powershell",
    pwsh: "powershell",
  };
  return map[lang] || null;
}
function chooseParser(lang, src) {
  switch (lang) {
    case "markup": return "html";
    case "css": return "css";
    case "json": return "json";
    case "typescript":
    case "tsx": return "typescript";
    case "javascript": return "babel";
    case "markdown": return "markdown";
    default: break; // bash/powershell -> no Prettier
  }
  const s = (src || "").trim();
  if (/^\s*</.test(s)) return "html";
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) return "json";
  if (/(^|\n)\s*(import|export)\s/m.test(s)) return "babel";
  if (/^#{1,6}\s/m.test(s)) return "markdown";
  return null;
}

function attachCopy(pre, codeEl) {
  pre.classList.add("relative");
  pre.querySelectorAll('[data-copy-btn="true"]').forEach((b) => b.remove());

  // Reserve space for the button so it never sits over the code text
  if (!codeEl.dataset.copyPadApplied) {
    const cs = getComputedStyle(codeEl);
    const padTop = Math.max(parseFloat(cs.paddingTop) || 0, 28);   // ~top-7
    const padRight = Math.max(parseFloat(cs.paddingRight) || 0, 40); // room for icon
    codeEl.style.paddingTop = `${padTop}px`;
    codeEl.style.paddingRight = `${padRight}px`;
    codeEl.dataset.copyPadApplied = "1";
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("data-copy-btn", "true");
  btn.setAttribute("aria-label", "Copy code");
  btn.title = "Copy";

  // Bigger icon, sit away from edges, white on hover, above code
  btn.className = [
    "group absolute top-2 right-2 z-10",
    "inline-grid place-items-center",
    "p-1.5 rounded-md",
    "bg-transparent",
    "text-neutral-300 hover:text-white",
    "focus:outline-none focus:ring-2 focus:ring-white/30",
    "transition-colors"
  ].join(" ");

  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="18" height="18" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const text = codeEl.innerText ?? codeEl.textContent ?? "";
      await navigator.clipboard.writeText(text);

      // flash primary color on click
      btn.classList.add("text-primary");
      setTimeout(() => btn.classList.remove("text-primary"), 900);
    } catch (err) {
      console.warn("Copy failed:", err);
    }
  });

  pre.appendChild(btn);
}
