#!/usr/bin/env python3
"""Parse the .docx revision notes into structured flashcards.

The notes are question/answer pairs, not prose. Structure observed across all
four files:

    BOLD paragraph, no '?'   -> sub-topic heading
    paragraph ending '?'     -> a card's question
    following paragraphs     -> that card's answer, until the next question
                                or heading. 'List Paragraph' style = a bullet.

Short paragraphs ending ':' ("The design must:", "Unless:") are answer lead-ins,
NOT headings -- they sit mid-answer and must stay with their card.

Output: content/notes/fc4-cards.json. Syllabus areas are proposed from the
heading map below and must be reviewed; nothing here is auto-confirmed.
"""
import json, re, sys
from pathlib import Path
import docx

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content/notes/source"
DEST = ROOT / "content/notes/fc4-cards.json"

# Heading -> syllabus area slugs. Proposed, not confirmed: a heading is a
# reasonable signal for an area but several span two.
HEADING_AREAS = {
    "Community Design Rights":          ["protection-of-designs-international", "eu-designs-post-brexit"],
    "Berne Convention":                 ["general-provisions-copyright"],
    "Copyright Overview":               ["copyright-literary-artistic-works"],
    "Copyright Infringement":           ["infringement-of-copyright"],
    "Requirements and Ownership":       ["registrable-designs", "ownership-registered-designs"],
    "Applications":                     ["application-process-registered-designs"],
    "Convention applications":          ["priority"],
    "Registration":                     ["application-process-registered-designs", "duration-of-registration"],
    "Ownership":                        ["ownership-registered-designs", "registered-design-as-property"],
    "Infringement":                     ["infringement-registered-designs"],
    "Invalidity":                       ["invalidity-registered-designs"],
    "UK (Unregistered) Design Right":   ["sudr-and-uk-design-right"],
    "Infringement of UK Design Right":  ["infringement-uk-design-right"],
}

def is_heading(p, idx):
    t = p.text.strip()
    if not t or t.endswith("?"):
        return False
    runs = [r for r in p.runs if r.text.strip()]
    if runs and all(r.bold for r in runs):
        return True
    # First non-empty paragraph is a heading even when not bold: the Copyright
    # file opens with an unbolded "Berne Convention".
    return idx == 0

def parse(path):
    d = docx.Document(str(path))
    paras = [p for p in d.paragraphs if p.text.strip()]
    cards, heading, cur = [], None, None
    for i, p in enumerate(paras):
        t = p.text.strip()
        if is_heading(p, i):
            heading = t
            cur = None
            continue
        if t.endswith("?"):
            cur = {
                "question": t,
                "answer": [],
                "heading": heading,
                "sourceFile": path.name,
                "areas": HEADING_AREAS.get(heading, []),
                "reviewStatus": "proposed",
                "verified": False,
            }
            cards.append(cur)
            continue
        if cur is not None:
            cur["answer"].append({
                "text": t,
                "bullet": p.style.name == "List Paragraph",
            })
    return cards

def main():
    files = sorted(SRC.glob("*.docx"))
    if not files:
        sys.exit(f"no .docx found in {SRC.relative_to(ROOT)}")
    all_cards, report = [], []
    for f in files:
        cards = parse(f)
        orphans = [c["question"] for c in cards if not c["heading"]]
        no_answer = [c["question"] for c in cards if not c["answer"]]
        unmapped = sorted({c["heading"] for c in cards if c["heading"] and not c["areas"]})
        report.append((f.name, len(cards), orphans, no_answer, unmapped))
        all_cards.extend(cards)

    for i, c in enumerate(all_cards, 1):
        c["id"] = f"card-{i:03d}"

    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps({
        "generatedBy": "scripts/parse_notes.py",
        "cardCount": len(all_cards),
        "cards": all_cards,
    }, indent=2, ensure_ascii=False) + "\n")

    print(f"wrote {DEST.relative_to(ROOT)}\n")
    for name, n, orphans, no_answer, unmapped in report:
        print(f"  {n:>3} cards  {name.split('(')[0]}")
        if orphans:   print(f"        !! {len(orphans)} card(s) before any heading")
        if no_answer: print(f"        !! {len(no_answer)} card(s) with no answer: {no_answer[:3]}")
        if unmapped:  print(f"        !! headings not in HEADING_AREAS: {unmapped}")
    print(f"\n  total: {len(all_cards)} cards")

    import collections
    areas = collections.Counter(a for c in all_cards for a in c["areas"])
    syl = json.loads((ROOT / "content/syllabus/fc4.json").read_text())
    print("\n  proposed coverage by syllabus area:")
    for a in syl["areas"]:
        n = areas.get(a["slug"], 0)
        flag = "" if n else "   <-- NO CARDS"
        print(f"    {a['number']:>2}  {n:>3}  {a['title'][:52]}{flag}")

if __name__ == "__main__":
    main()
