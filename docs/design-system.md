# Design system — editorial / law report

The tool should read like a well-set law report that happens to be interactive.
Not a dashboard. Long reading sessions are the primary use, so typography and
rhythm matter more than chrome, colour or motion.

**Principles**

1. **Rules, not boxes.** Hairline rules and whitespace do the separating. Cards
   and drop shadows are a last resort — a law report has neither.
2. **The text is the interface.** Chrome recedes; content sits at a comfortable
   measure in a serif sized for sustained reading.
3. **Citations are typographically distinct.** `CDPA s.213` must never read as
   prose. Mono, always.
4. **One accent.** Claret, used for links, citations and the current item. Never
   decoratively.
5. **Restraint in motion.** Nothing bounces. Reveals are the only animation that
   carries meaning.

## Tokens

Paste into `app/globals.css`. Light is defined on bare `:root`; dark is
redefined twice so an explicit toggle wins in both directions.

```css
:root {
  /* ground + ink */
  --paper:        #FCFBF8;   /* warm off-white, not pure white */
  --paper-raised: #FFFFFF;
  --paper-sunk:   #F4F1EA;   /* answer editor, code, inset blocks */
  --ink:          #1A1714;   /* warm near-black */
  --ink-muted:    #5C554C;
  --ink-faint:    #8A8278;
  --rule:         #E2DDD3;
  --rule-strong:  #CFC7B8;

  /* accent — claret */
  --accent:       #8A3033;
  --accent-hover: #6E2528;
  --accent-soft:  #F3E7E5;   /* tint background */
  --accent-ink:   #FFFFFF;   /* text on solid accent */

  /* semantic */
  --ok:      #2F6B4F;
  --ok-soft: #E6F0E9;
  --warn:      #8A6516;
  --warn-soft: #F7EED8;
  --highlight: #F7E9C4;      /* search hit */

  /* type */
  --font-serif: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-sans:  "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono:  "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;

  --text-xs:   0.75rem;    --lh-xs:   1.45;
  --text-sm:   0.8125rem;  --lh-sm:   1.5;
  --text-ui:   0.9375rem;  --lh-ui:   1.5;
  --text-base: 1.0625rem;  --lh-base: 1.7;   /* 17px, generous — legal prose */
  --text-lg:   1.25rem;    --lh-lg:   1.55;
  --text-xl:   1.5rem;     --lh-xl:   1.35;
  --text-2xl:  1.9375rem;  --lh-2xl:  1.25;

  --measure:      68ch;    /* content column */
  --measure-tight: 58ch;   /* mark scheme, sidebars */

  /* space — 4px base */
  --s-1: 0.25rem;  --s-2: 0.5rem;   --s-3: 0.75rem;  --s-4: 1rem;
  --s-5: 1.5rem;   --s-6: 2rem;     --s-7: 3rem;     --s-8: 4rem;

  --radius:    3px;   /* deliberately small */
  --radius-lg: 6px;

  --dur-fast: 120ms;
  --dur-base: 200ms;
  --ease: cubic-bezier(0.2, 0, 0.13, 1);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper:        #151310;
    --paper-raised: #1E1B17;
    --paper-sunk:   #100E0C;
    --ink:          #EDE8E0;
    --ink-muted:    #A69E92;
    --ink-faint:    #736C61;
    --rule:         #2E2A24;
    --rule-strong:  #453F36;
    --accent:       #C4666A;
    --accent-hover: #D88186;
    --accent-soft:  #2B1B1C;
    --accent-ink:   #17110F;
    --ok:      #6FBF95;  --ok-soft:   #16261E;
    --warn:    #D4A94A;  --warn-soft: #2A2113;
    --highlight: #4A3C1B;
  }
}

:root[data-theme="dark"] {
  /* same overrides as the media block above — duplicate them verbatim */
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: var(--text-ui);
  line-height: var(--lh-ui);
}
```

**Fonts.** Source Serif 4, Inter and IBM Plex Mono are all on Google Fonts. Load
via `next/font/google` with `display: "swap"` and the fallback stacks above —
never a bare family name.

## Usage rules

| Element | Font | Size | Notes |
|---|---|---|---|
| Content prose, question stems, scenarios | serif | `--text-base` | at `--measure`, never wider |
| Headings | serif | `--text-xl` / `--text-2xl` | tight leading |
| UI chrome, nav, buttons, labels | sans | `--text-ui` / `--text-sm` | |
| Statutory citations | **mono** | `--text-sm` | always, everywhere |
| Mark values ("8 marks") | mono | `--text-sm` | `--ink-muted` |
| Area / question numbers | mono | varies | tabular figures |

Set `font-variant-numeric: tabular-nums` on anything showing marks or scores so
columns align.

## Component patterns

**Citation chip** — the most-repeated element in the app.
```
CDPA s.213   ← mono, --accent, no underline at rest
             ← underline on hover, --accent-hover
             ← opens legislation.gov.uk in a new tab
             ← title attribute carries the full provision heading
```
Render from `content/provisions.json`; never hand-write a citation in MDX.

**Area heading** — the law-report signature.
```
12 ── Supplementary unregistered design right
──────────────────────────────────────────────
```
Mono number, serif title, hairline rule spanning the measure beneath.

**Learning outcome checklist** — one row per outcome, letter in mono, text in
serif, checkbox on the left. "Apply to a scenario" outcomes get a subtle
`--accent-soft` tint: they are the Section B skill and should look different.

**Progressive reveal (Section B)** — the load-bearing pattern. Narrative blocks
in serif at full measure; each sub-question in a block inset by a 2px
`--rule-strong` left border with its letter in mono and marks right-aligned.
Later narrative renders *below* the preceding sub-question and is dimmed to
`--ink-faint` until that sub-question is answered or explicitly skipped. See
`docs/ui.md`.

**Mark scheme item** — checkbox, serif text, mono mark value right-aligned.
Awarded items tint `--ok-soft`. Half marks show as `½`, not `0.5`.

**Answer editor** — `--paper-sunk` ground, serif at `--text-base`, generous
padding, no visible border until focus (then a 1px `--accent` ring). It should
feel like writing on paper, not filling in a form.

## Accessibility

- All body/muted text pairs meet WCAG AA on their ground in both themes.
  `--ink-faint` on `--paper` is 4.6:1 — do not lighten it further.
- Never signal state by colour alone: awarded mark scheme items get a check
  glyph as well as a tint; completion gets a label as well as a dot.
- Focus rings visible on every interactive element: 2px `--accent`, 2px offset.
- Wrap all motion in `@media (prefers-reduced-motion: reduce)` and disable it.
- Tables and long code blocks scroll inside `overflow-x: auto`; the page body
  must never scroll horizontally.
