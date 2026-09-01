import { ExternalLink } from "lucide-react";
import { getProvisionsMap, getCasesMap } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Renders a single statutory citation. Always resolved from
 * content/provisions.json by id — never hand-write a citation in markup, so
 * every reference in the app stays consistent and link-checkable in one place
 * (see docs/design-system.md, "Citation chip").
 */
export function CitationChip({ id, className }: { id: string; className?: string }) {
  const provision = getProvisionsMap().get(id);
  if (!provision) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-sm border border-warn/40 bg-warn-soft px-1.5 py-0.5 font-mono text-xs text-warn"
        title={`Unknown provision id: ${id}`}
      >
        {id} ?
      </span>
    );
  }
  return (
    <a
      href={provision.url}
      target="_blank"
      rel="noopener noreferrer"
      title={provision.title ? `${provision.title}${!provision.titleVerified ? " (title not yet verified)" : ""}` : "Title not yet verified"}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1 font-mono text-sm text-accent no-underline",
        "hover:text-accent-hover hover:underline decoration-1 underline-offset-2",
        "transition-colors duration-(--dur-fast)",
        !provision.titleVerified && "border-b border-dotted border-accent/40",
        className,
      )}
    >
      {provision.citation}
      <ExternalLink size={10} strokeWidth={2} className="opacity-60" aria-hidden />
    </a>
  );
}

export function CaseChip({ id, className }: { id: string; className?: string }) {
  const c = getCasesMap().get(id);
  if (!c) {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-warn/40 bg-warn-soft px-1.5 py-0.5 font-mono text-xs text-warn">
        {id} ?
      </span>
    );
  }
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      title={c.note ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1 font-serif italic text-sm text-accent no-underline",
        "hover:text-accent-hover hover:underline decoration-1 underline-offset-2",
        "transition-colors duration-(--dur-fast)",
        className,
      )}
    >
      {c.label}
      <ExternalLink size={10} strokeWidth={2} className="opacity-60 not-italic" aria-hidden />
    </a>
  );
}
