"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { Card } from "@/lib/content";
import { recordCardReview, type CardConfidence } from "@/lib/actions";
import { NoteBody } from "@/components/note-body";
import { cn } from "@/lib/utils";

const CONFIDENCE: Array<{ value: CardConfidence; label: string; className: string }> = [
  { value: "again", label: "Again", className: "border-accent/40 text-accent hover:bg-accent-soft" },
  { value: "hard", label: "Hard", className: "border-warn/40 text-warn hover:bg-warn-soft" },
  { value: "good", label: "Good", className: "border-rule-strong text-ink hover:bg-paper-sunk" },
  { value: "easy", label: "Easy", className: "border-ok/40 text-ok hover:bg-ok-soft" },
];

export function CardSelfTest({ cards }: { cards: Card[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pending, startTransition] = useTransition();

  if (cards.length === 0) return null;

  const card = cards[index];
  const atEnd = index >= cards.length;

  function next() {
    setShowAnswer(false);
    setIndex((i) => Math.min(i + 1, cards.length));
  }

  function rate(confidence: CardConfidence) {
    startTransition(async () => {
      await recordCardReview(card.id, confidence);
      next();
    });
  }

  return (
    <div id="cards" className="border border-rule rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Layers size={15} strokeWidth={1.75} className="text-ink-faint" aria-hidden />
          Cards · {cards.length}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-ink-faint transition-transform duration-(--dur-fast)", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-rule px-4 py-4">
          {atEnd ? (
            <div className="py-6 text-center">
              <p className="text-sm text-ink-muted">
                Done — {cards.length} of {cards.length} reviewed.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setShowAnswer(false);
                }}
                className="mt-3 rounded-sm border border-rule-strong px-3 py-1.5 text-xs text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
              >
                Start again
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-ink-faint mb-3">
                <span className="font-mono">
                  {index + 1} / {cards.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      setShowAnswer(false);
                      setIndex((i) => Math.max(0, i - 1));
                    }}
                    className="rounded-sm p-1 hover:bg-paper-sunk disabled:opacity-30 transition-colors duration-(--dur-fast)"
                    aria-label="Previous card"
                  >
                    <ChevronLeft size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="rounded-sm p-1 hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
                    aria-label="Skip card"
                  >
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>

              <p className="font-serif text-base text-ink mb-1">{card.question}</p>
              {card.heading && <p className="text-xs text-ink-faint mb-4">{card.heading}</p>}

              {showAnswer ? (
                <div className="mt-3 rounded-sm bg-paper-sunk px-4 py-3">
                  <NoteBody entries={card.answer} className="text-sm" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="mt-2 rounded-sm border border-rule-strong px-3 py-1.5 text-xs text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
                >
                  Show answer
                </button>
              )}

              {showAnswer && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {CONFIDENCE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      disabled={pending}
                      onClick={() => rate(c.value)}
                      className={cn(
                        "rounded-sm border px-3 py-1.5 text-xs transition-colors duration-(--dur-fast) disabled:opacity-50",
                        c.className,
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
