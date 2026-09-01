"use client";

import { useState, useTransition } from "react";
import { Flag, ShieldCheck } from "lucide-react";
import { markSupplementVerified } from "@/lib/actions";

/**
 * Functional, not decorative: model-written law is the least reliable part
 * of this app (see docs/ui.md, "Verification markers"). Shows the sources
 * the supplement was checked against and lets the user flip it once they've
 * verified the content themselves.
 */
export function VerifiedFlag({
  filename,
  verified,
  sources,
}: {
  filename: string;
  verified: boolean;
  sources: string[];
}) {
  const [isVerified, setIsVerified] = useState(verified);
  const [pending, startTransition] = useTransition();

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-ok-soft px-2 py-1 text-xs text-ok">
        <ShieldCheck size={13} strokeWidth={2} aria-hidden />
        Verified
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
      <Flag size={13} strokeWidth={2} className="shrink-0" aria-hidden />
      <span className="font-medium">Unverified — model-written, not yet checked against source</span>
      {sources.length > 0 && (
        <details className="w-full basis-full">
          <summary className="cursor-pointer select-none text-warn/80 hover:text-warn">
            Sources ({sources.length})
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 font-mono text-[11px] text-warn/90">
            {sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await markSupplementVerified(filename);
            setIsVerified(true);
          })
        }
        className="ml-auto shrink-0 rounded-sm border border-warn/40 px-2 py-1 font-sans text-xs text-warn hover:bg-warn/10 transition-colors duration-(--dur-fast) disabled:opacity-50"
      >
        {pending ? "Marking…" : "Mark verified"}
      </button>
    </div>
  );
}
