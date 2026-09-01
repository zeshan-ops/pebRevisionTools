import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, ArrowRight, Info } from "lucide-react";
import { getAreaBundle, getSyllabus } from "@/lib/content";
import { CitationChip, CaseChip } from "@/components/citation-chip";
import { NoteBody } from "@/components/note-body";
import { Markdown } from "@/components/markdown";
import { VerifiedFlag } from "@/components/verified-flag";
import { CardSelfTest } from "@/components/card-self-test";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return getSyllabus().areas.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = getAreaBundle(slug);
  return { title: bundle ? `${bundle.area.number} — ${bundle.area.title}` : "Not found" };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = getAreaBundle(slug);
  if (!bundle) notFound();

  const { area, outcomes, cards, provisions, cases } = bundle;

  const allAreas = getSyllabus().areas;
  const pos = allAreas.findIndex((a) => a.slug === slug);
  const prevArea = pos > 0 ? allAreas[pos - 1] : undefined;
  const nextArea = pos < allAreas.length - 1 ? allAreas[pos + 1] : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/content"
        className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink transition-colors duration-(--dur-fast)"
      >
        <ArrowLeft size={12} aria-hidden />
        All areas
      </Link>

      {/* Area heading — the law-report signature (docs/design-system.md) */}
      <div className="mt-4">
        <h1 className="flex items-baseline gap-3 font-serif text-2xl font-semibold text-ink">
          <span className="font-mono text-lg text-ink-faint tabular-nums">{area.number}</span>
          {area.title}
        </h1>
        <p className="mt-1 text-sm text-ink-faint">{area.ipregTopics.join(" · ")}</p>
      </div>
      <hr className="mt-4 border-rule" />

      {area.sourceNote && (
        <div className="mt-4 flex gap-2 rounded-sm bg-paper-sunk px-3 py-2.5 text-xs text-ink-muted">
          <Info size={14} className="shrink-0 mt-0.5 text-ink-faint" aria-hidden />
          <span>{area.sourceNote}</span>
        </div>
      )}

      {/* Learning outcomes, each with merged prose + supplements */}
      <div className="mt-8 space-y-8">
        {outcomes.map(({ outcome, prose, supplements, isGap, looselyAttributed }) => (
          <section key={outcome.letter} id={`outcome-${outcome.letter}`} className="scroll-mt-20">
            <h2
              className={cn(
                "font-serif text-lg text-ink px-3 py-2 -mx-3 rounded-sm",
                outcome.isApplication && "bg-accent-soft",
              )}
            >
              <span className="font-mono text-base text-ink-faint mr-2">{outcome.letter})</span>
              {outcome.text}
            </h2>

            <div className="mt-3 pl-3 border-l-2 border-rule-strong">
              {outcome.isApplication ? (
                <p className="text-sm text-ink-faint italic">
                  Section B application skill — practiced against full scenarios rather than
                  explained as content. Practice questions for this area will appear here once
                  the extraction pipeline (Phase 2) has run.
                </p>
              ) : isGap ? (
                <div className="flex items-start gap-2 rounded-sm border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden />
                  <span>No notes, supplement or card cover this outcome yet.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {looselyAttributed && (
                    <p className="text-xs text-ink-faint italic">
                      Attribution uncertain — recovered from body text rather than a heading in
                      the source document.
                    </p>
                  )}
                  {prose && <NoteBody entries={prose.body} />}
                  {prose?.subsections.map((sub, i) => (
                    <div key={i}>
                      <h3 className="font-serif text-sm font-semibold text-ink-muted mb-1.5">
                        {sub.heading}
                      </h3>
                      <NoteBody entries={sub.body} />
                    </div>
                  ))}
                  {supplements.map((sup) => (
                    <div key={sup.filename} className="rounded-lg border border-rule p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-serif text-base font-semibold text-ink">{sup.title}</h3>
                      </div>
                      <VerifiedFlag
                        filename={sup.filename}
                        verified={sup.verified}
                        sources={sup.sources}
                      />
                      <Markdown className="mt-4">{sup.body}</Markdown>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Cards self-test */}
      <div className="mt-10">
        <CardSelfTest cards={cards} />
      </div>

      {/* Provisions */}
      {provisions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">
            Provisions
          </h2>
          <div className="flex flex-wrap gap-x-1 gap-y-2">
            {provisions.map((p) => (
              <CitationChip key={p.id} id={p.id} />
            ))}
          </div>
        </div>
      )}

      {/* Cases */}
      {cases.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">Cases</h2>
          <div className="flex flex-col gap-1.5">
            {cases.map((c) => (
              <CaseChip key={c.id} id={c.id} />
            ))}
          </div>
        </div>
      )}

      {/* Questions in this area — Phase 2 not yet run */}
      <div className="mt-8 rounded-sm bg-paper-sunk px-3 py-2.5 text-xs text-ink-faint">
        Questions in this area will list here once past papers are extracted (Phase 2).
      </div>

      {/* Prev / next */}
      <nav className="mt-10 flex items-center justify-between border-t border-rule pt-4 text-sm">
        {prevArea ? (
          <Link
            href={`/content/${prevArea.slug}`}
            className="inline-flex items-center gap-1.5 text-ink-muted hover:text-accent transition-colors duration-(--dur-fast)"
          >
            <ArrowLeft size={14} aria-hidden />
            {prevArea.number} {prevArea.title}
          </Link>
        ) : (
          <span />
        )}
        {nextArea ? (
          <Link
            href={`/content/${nextArea.slug}`}
            className="inline-flex items-center gap-1.5 text-ink-muted hover:text-accent transition-colors duration-(--dur-fast) text-right"
          >
            {nextArea.number} {nextArea.title}
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
