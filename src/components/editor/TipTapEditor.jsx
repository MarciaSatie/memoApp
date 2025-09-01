"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details'
import { Placeholder } from '@tiptap/extensions'
import { SquarePlus, ChevronDown } from "lucide-react";


import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Code as CodeIcon,
  List as BulletIcon,
  ListOrdered as OrderedIcon,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, X as ClearIcon, Link as LinkIcon, Link2Off as UnlinkIcon,
  PaintBucket
} from "lucide-react";

export default function TipTapEditor({
  value,
  onChange,
  disabled = false,
  className = "",
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
    StarterKit,
    TextStyle,
    Color,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    Details.configure({ HTMLAttributes: { class: "border rounded p-2 my-2" } }),
    DetailsSummary,
    DetailsContent,
    Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === 'detailsSummary') {
            return 'Summary'
          }

          return null
        },
      }),
    ],

    content: value || `
      <p>Look at these details</p>
      <details>
        <summary>This is a summary</summary>
        <p>Surprise!</p>
      </details>
      <p>Nested details are also supported</p>
      <details open>
        <summary>This is another summary</summary>
        <p>And there is even more.</p>
        <details>
          <summary>We need to go deeper</summary>
          <p>Booya!</p>
        </details>
      </details>
    `,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  // local color value to apply on demand
  const [colorValue, setColorValue] = useState("#000000");

  useEffect(() => {
    if (editor && editor.getHTML() !== (value || "")) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const btnBase =
    "px-2.5 py-1.5 border rounded text-sm grid place-items-center bg-neutral-100 hover:bg-neutral-200";
  const activeCls = "bg-neutral-300";
  const dis = !editor || disabled ? "opacity-60 cursor-not-allowed" : "";

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link")?.href || "";
    const url = window.prompt("Enter URL:", prev);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().setLink({ href }).run();
  }

  function unsetLink() {
    editor?.chain().focus().unsetLink().run();
  }

  // apply currently picked color to the selection
  function applyPickedColor() {
    if (!editor || disabled) return;
    editor.chain().focus().setColor(colorValue).run();
  }

  // quick swatch
  function applySwatch(hex) {
    if (!editor || disabled) return;
    setColorValue(hex);
    editor.chain().focus().setColor(hex).run();
  }

  let styleValue = "flex gap-1 border-2 border-neutral-300 rounded-lg p-1";
  let styleValue2 = "flex items-center gap-1 border-2 border-neutral-300 rounded-lg p-1";
  let iconSize = 12;
  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2 bg text-black">
        {/* Headings */}
        <div className={styleValue}>
          {[1, 2, 3, 4, 5, 6].map((level) => {
            const Icon = { 1: Heading1, 2: Heading2, 3: Heading3, 4: Heading4, 5: Heading5, 6: Heading6 }[level];
            return (
              <button
                key={level}
                type="button"
                onClick={() => editor.chain().focus().setHeading({ level }).run()}
                disabled={!editor || disabled}
                className={`${btnBase} ${editor.isActive("heading", { level }) ? activeCls : ""} ${dis}`}
                title={`Heading ${level}`}
                aria-pressed={editor.isActive("heading", { level })}
              >
                <Icon size={iconSize} />
              </button>
            );
          })}
        </div>

        {/* Inline styles */}
        <div className={styleValue}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive("bold") ? activeCls : ""} ${dis}`}
            title="Bold (Ctrl+B)"
            aria-pressed={editor.isActive("bold")}
          >
            <BoldIcon size={iconSize} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive("italic") ? activeCls : ""} ${dis}`}
            title="Italic (Ctrl+I)"
            aria-pressed={editor.isActive("italic")}
          >
            <ItalicIcon size={iconSize} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive("codeBlock") ? activeCls : ""} ${dis}`}
            title="Code block"
            aria-pressed={editor.isActive("codeBlock")}
          >
            <CodeIcon size={iconSize} />
          </button>
        </div>

        {/* Lists */}
        <div className={styleValue}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive("bulletList") ? activeCls : ""} ${dis}`}
            title="Bullet list"
            aria-pressed={editor.isActive("bulletList")}
          >
            <BulletIcon size={iconSize} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive("orderedList") ? activeCls : ""} ${dis}`}
            title="Ordered list"
            aria-pressed={editor.isActive("orderedList")}
          >
            <OrderedIcon size={iconSize} />
          </button>
        </div>

        {/* Alignment */}
        <div className={styleValue}>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive({ textAlign: "left" }) ? activeCls : ""} ${dis}`}
            title="Align left"
            aria-pressed={editor.isActive({ textAlign: "left" })}
          >
            <AlignLeft size={iconSize} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive({ textAlign: "center" }) ? activeCls : ""} ${dis}`}
            title="Align center"
            aria-pressed={editor.isActive({ textAlign: "center" })}
          >
            <AlignCenter size={iconSize} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive({ textAlign: "right" }) ? activeCls : ""} ${dis}`}
            title="Align right"
            aria-pressed={editor.isActive({ textAlign: "right" })}
          >
            <AlignRight size={iconSize} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive({ textAlign: "justify" }) ? activeCls : ""} ${dis}`}
            title="Justify"
            aria-pressed={editor.isActive({ textAlign: "justify" })}
          >
            <AlignJustify size={iconSize} />
          </button>
        </div>

      {/* Link / Unlink */}     
      <div className={styleValue2}>
             
          <button
            type="button"
            onClick={setLink}
            disabled={!editor || disabled}
            className={`${btnBase} ${editor.isActive("link") ? activeCls : ""} ${dis}`}
            title="Add or edit link"
            aria-pressed={editor.isActive("link")}
          >
            <LinkIcon size={iconSize} />
          </button>
          <button
            type="button"
            onClick={unsetLink}
            disabled={!editor || disabled}
            className={`${btnBase} ${dis}`}
            title="Remove link"
          >
            <UnlinkIcon size={iconSize} />
          </button>
        </div>

        {/* Text color + Link */}
        <div className={styleValue2}>
          {/* picker (doesn't apply automatically) */}
          <span className="inline-flex items-center gap-1 px-2 py-1 border rounded bg-neutral-100">
            <Palette size={14} />
            <input
              type="color"
              value={colorValue}
              onChange={(e) => setColorValue(e.target.value)}
              disabled={!editor || disabled}
              className="h-5 w-6 border-0 bg-transparent p-0"
              title="Pick color"
            />
          </span>

          {/* apply current color */}
          <button
            type="button"
            onClick={applyPickedColor}
            disabled={!editor || disabled}
            className={`${btnBase} ${dis}`}
            title="Apply color to selection"
          >
            <PaintBucket size={iconSize} />
          </button>

          {/* quick swatches */}
          {["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7"].map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => applySwatch(hex)}
              disabled={!editor || disabled}
              className="h-6 w-6 rounded border"
              style={{ backgroundColor: hex }}
              title={`Set ${hex}`}
            />
          ))}

          {/* clear color */}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            disabled={!editor || disabled}
            className={`${btnBase} ${dis}`}
            title="Clear color"
          >
            <ClearIcon size={14} />
          </button>       
        </div>

        {/* Details */}
        <div className={styleValue}>
            {/* Insert a new <details> block */}
            <button
                type="button"
                onClick={() =>
                editor
                    .chain()
                    .focus()
                    .insertContent({
                    type: "details",
                    attrs: { open: true },
                    content: [
                        {
                            type: "detailsSummary",
                            content: [{ type: "text", text: "Summary" }],
                        },
                        {
                        type: "detailsContent",
                        attrs: { open: true },
                        content: [
                            {
                                type: "paragraph",
                                content: [{ type: "text", text: "Details content…" }],
                            },
                        ],
                        },
                    ],
                    })
                    .run()
                }
                disabled={!editor || disabled}
                className={`${btnBase} ${dis}`}
                title="Insert details"
            >
                <SquarePlus size={iconSize} />
            </button>

            {/* Toggle open/closed on the current details block */}
            <button
                type="button"
                onClick={() => {
                const isOpen = !!editor.getAttributes("details").open;
                editor.chain().focus().updateAttributes("details", { open: !isOpen }).run();
                }}
                disabled={!editor || disabled || !editor.isActive("details")}
                className={`${btnBase} ${editor.isActive("details") ? activeCls : ""} ${dis}`}
                title="Toggle details open/closed"
                aria-pressed={editor.isActive("details")}
            >
                <ChevronDown size={iconSize} />
            </button>
         </div>

      </div>

      {/* Editor */}
      <div className="overflow-auto max-h-[440px]">
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}
