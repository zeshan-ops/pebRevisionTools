import Link from "next/link";
import type { Metadata } from "next";
import { getAllAreaBundles } from "@/lib/content";

export const metadata: Metadata = { title: "Content" };

export default function ContentIndexPage() {
  const bundles = getAllAreaBundles();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">FC4 syllabus</h1>
      <p className="mt-2 text-sm text-ink-muted max-w-(--measure)">
        The sixteen content areas set by the 2026 syllabus, in order. Each page merges
        prose notes, hand-written supplements and self-test cards under their learning
        outcome.
      </p>

      <div className="mt-8 border-t border-rule">
        {bundles.map(({ area, outcomes, cards }) => {
          const nonApplication = outcomes.filter((o) => !o.outcome.isApplication);
          const covered = nonApplication.filter((o) => !o.isGap).length;
          const gaps = nonApplication.length - covered;

          return (
            <Link
              key={area.slug}
              href={`/content/${area.slug}`}
              className="group flex items-start gap-4 border-b border-rule py-4 hover:bg-paper-sunk transition-colors duration-(--dur-fast) px-2 -mx-2 rounded-sm"
            >
              <span className="font-mono text-sm text-ink-faint tabular-nums w-6 shrink-0 pt-0.5">
                {area.number}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-base text-ink group-hover:text-accent transition-colors duration-(--dur-fast)">
                  {area.title}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">{area.ipregTopics.join(" · ")}</p>
              </div>
              <div className="shrink-0 text-right text-xs font-mono tabular-nums pt-0.5">
                <div className={gaps > 0 ? "text-warn" : "text-ok"}>
                  {covered}/{nonApplication.length} outcomes
                </div>
                {cards.length > 0 && (
                  <div className="text-ink-faint mt-0.5">{cards.length} cards</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
