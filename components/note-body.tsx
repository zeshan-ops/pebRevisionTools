import type { NoteEntry } from "@/lib/content";
import { normalizeNoteText } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Renders a list of NoteEntry (prose paragraphs / docx bullets), grouping
 * consecutive bullet items into a single <ul> rather than one per item.
 */
export function NoteBody({ entries, className }: { entries: NoteEntry[]; className?: string }) {
  if (entries.length === 0) return null;

  const blocks: Array<{ kind: "p"; text: string } | { kind: "ul"; items: string[] }> = [];
  for (const entry of entries) {
    const text = normalizeNoteText(entry.text);
    if (!text) continue;
    if (entry.bullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ul") last.items.push(text);
      else blocks.push({ kind: "ul", items: [text] });
    } else {
      blocks.push({ kind: "p", text });
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, i) =>
        block.kind === "p" ? (
          <p key={i} className="whitespace-pre-line text-ink">
            {block.text}
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-ink-faint">
            {block.items.map((item, j) => (
              <li key={j} className="whitespace-pre-line text-ink">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
