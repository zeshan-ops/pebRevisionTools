import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-rule p-8 text-center">
        <ClipboardList size={28} strokeWidth={1.5} className="mx-auto text-ink-faint" aria-hidden />
        <h1 className="mt-4 font-serif text-xl text-ink">Practice questions aren&apos;t loaded yet</h1>
        <p className="mt-2 max-w-(--measure) mx-auto text-sm text-ink-muted">
          Past papers for 2022–2024 are in <code className="font-mono text-xs bg-paper-sunk rounded-sm px-1 py-0.5">exam-materials/</code>,
          but the extraction pipeline that turns them into answerable questions
          (Phase 2 — see <code className="font-mono text-xs bg-paper-sunk rounded-sm px-1 py-0.5">docs/extraction.md</code>) hasn&apos;t run yet.
          This page will list every sub-question, filterable by syllabus area and section, once it has.
        </p>
      </div>
    </div>
  );
}
