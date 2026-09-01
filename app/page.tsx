import Link from "next/link";
import { ArrowRight, Clock, Target } from "lucide-react";
import { getAllAreaBundles, getSyllabus } from "@/lib/content";
import { countCardsReviewed } from "@/lib/db";

export default function OverviewPage() {
  const syllabus = getSyllabus();
  const bundles = getAllAreaBundles();
  const cardsReviewed = countCardsReviewed();

  const totalOutcomes = bundles.reduce(
    (n, b) => n + b.outcomes.filter((o) => !o.outcome.isApplication).length,
    0,
  );
  const coveredOutcomes = bundles.reduce(
    (n, b) => n + b.outcomes.filter((o) => !o.outcome.isApplication && !o.isGap).length,
    0,
  );
  const totalCards = bundles.reduce((n, b) => n + b.cards.length, 0);
  const gapAreas = bundles.filter((b) =>
    b.outcomes.some((o) => !o.outcome.isApplication && o.isGap),
  );

  const sectionA = syllabus.exam.sections.find((s) => s.id === "A");
  const sectionB = syllabus.exam.sections.find((s) => s.id === "B");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">
        FC4 — {syllabus.title}
      </h1>
      <p className="mt-2 max-w-(--measure) text-sm text-ink-muted">
        Revision material mapped directly to the PEB syllabus, sixteen content areas at a
        time.
      </p>

      {/* Exam format */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={Clock} label="Duration" value={`${syllabus.exam.durationMins / 60}h`} />
        <Stat icon={Target} label="Pass mark" value={`${syllabus.exam.passMark}%`} />
        <Stat
          icon={Target}
          label="Section A"
          value={`${sectionA?.totalMarks} marks`}
          sub="all compulsory"
        />
        <Stat
          icon={Target}
          label="Section B"
          value={`${sectionB?.totalMarks} marks`}
          sub={`choose ${sectionB?.choose} of ${sectionB?.questionNumbers.length}`}
        />
      </div>

      {/* Content coverage */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg text-ink">Content coverage</h2>
          <span className="font-mono text-sm text-ink-muted tabular-nums">
            {coveredOutcomes}/{totalOutcomes} outcomes · {totalCards} cards
            {cardsReviewed > 0 && ` · ${cardsReviewed} reviewed`}
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full bg-paper-sunk overflow-hidden">
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${(coveredOutcomes / totalOutcomes) * 100}%` }}
          />
        </div>

        {gapAreas.length > 0 && (
          <div className="mt-4 rounded-sm bg-warn-soft px-3 py-2.5 text-sm text-warn">
            {gapAreas.length} area{gapAreas.length === 1 ? "" : "s"} with an uncovered
            outcome:{" "}
            {gapAreas.map((b, i) => (
              <span key={b.area.slug}>
                {i > 0 && ", "}
                <Link href={`/content/${b.area.slug}`} className="underline hover:text-accent-hover">
                  {b.area.number}
                </Link>
              </span>
            ))}
          </div>
        )}

        <Link
          href="/content"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors duration-(--dur-fast)"
        >
          Browse all sixteen areas
          <ArrowRight size={14} aria-hidden />
        </Link>
      </section>

      {/* Practice — honest status, not fabricated stats */}
      <section className="mt-10 rounded-lg border border-rule p-5">
        <h2 className="font-serif text-lg text-ink">Practice</h2>
        <p className="mt-1.5 text-sm text-ink-muted max-w-(--measure)">
          Past papers (2022–2024) are loaded but not yet extracted into questions —
          that&apos;s Phase 2. Once it runs, this section will show exam-equivalent score,
          coverage by area and a resume-last-attempt link, using real attempt data rather
          than placeholders.
        </p>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-sm bg-paper-sunk px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
        <Icon size={12} strokeWidth={1.75} aria-hidden />
        {label}
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums text-ink">{value}</div>
      {sub && <div className="text-[11px] text-ink-faint">{sub}</div>}
    </div>
  );
}
