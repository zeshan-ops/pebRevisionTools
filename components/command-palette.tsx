"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import MiniSearch from "minisearch";
import { BookOpen, ListChecks, Scale, Gavel, Layers, Search } from "lucide-react";
import { SEARCH_OPTIONS, type SearchDoc } from "@/lib/search-shared";

const TYPE_ICON: Record<SearchDoc["type"], typeof BookOpen> = {
  area: BookOpen,
  outcome: ListChecks,
  provision: Gavel,
  case: Scale,
  card: Layers,
};

const TYPE_LABEL: Record<SearchDoc["type"], string> = {
  area: "Area",
  outcome: "Learning outcome",
  provision: "Provision",
  case: "Case",
  card: "Flashcard",
};

export function CommandPalette({ index }: { index: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const ms = useMemo(() => MiniSearch.loadJSON<SearchDoc>(index, SEARCH_OPTIONS), [index]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return ms.search(query).slice(0, 24) as unknown as Array<
      SearchDoc & { id: string; score: number }
    >;
  }, [ms, query]);

  function select(doc: SearchDoc) {
    setOpen(false);
    setQuery("");
    if (doc.external) {
      window.open(doc.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(doc.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
      >
        <Search size={14} strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline font-mono text-xs text-ink-faint border border-rule rounded-sm px-1 py-0.5 ml-1">
          ⌘K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search"
        shouldFilter={false}
        className="fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-ink/40"
        contentClassName="fixed left-1/2 top-[15%] w-[min(560px,90vw)] -translate-x-1/2 rounded-lg border border-rule bg-paper-raised shadow-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-rule px-4">
          <Search size={16} className="text-ink-faint shrink-0" aria-hidden />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search areas, outcomes, provisions, cases, cards…"
            className="w-full bg-transparent py-3 text-sm text-ink placeholder:text-ink-faint outline-none"
          />
          <kbd className="font-mono text-xs text-ink-faint border border-rule rounded-sm px-1 py-0.5 shrink-0">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === "" && (
            <div className="px-3 py-8 text-center text-sm text-ink-faint">
              Type to search the syllabus, citations and cards.
            </div>
          )}
          {query.trim() !== "" && results.length === 0 && (
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-faint">
              No results for “{query}”.
            </Command.Empty>
          )}
          {results.map((doc) => {
            const Icon = TYPE_ICON[doc.type];
            return (
              <Command.Item
                key={doc.id}
                value={doc.id}
                onSelect={() => select(doc)}
                className="flex items-start gap-3 rounded-sm px-3 py-2.5 cursor-pointer data-[selected=true]:bg-paper-sunk"
              >
                <Icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-ink">{doc.title}</div>
                  {doc.subtitle && (
                    <div className="truncate text-xs text-ink-faint">{doc.subtitle}</div>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-ink-faint mt-1">
                  {TYPE_LABEL[doc.type]}
                </span>
              </Command.Item>
            );
          })}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
