import type { Metadata } from "next";
import { ListChecks } from "lucide-react";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-rule p-8 text-center">
        <ListChecks size={28} strokeWidth={1.5} className="mx-auto text-ink-faint" aria-hidden />
        <h1 className="mt-4 font-serif text-xl text-ink">Nothing to review yet</h1>
        <p className="mt-2 max-w-(--measure) mx-auto text-sm text-ink-muted">
          This queue reviews the syllabus areas proposed for each extracted sub-question
          against the ones you confirm. It populates once Phase 2 has extracted and
          categorised questions from the past papers.
        </p>
      </div>
    </div>
  );
}
