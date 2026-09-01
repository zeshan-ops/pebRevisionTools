#!/usr/bin/env python3
"""Verify provision titles and URLs against legislation.gov.uk.

Fetches the /data.xml representation of each UK provision, extracts the real
heading, and writes it back into content/provisions.json with titleVerified
set. Any URL that 404s is flagged so a wrong citation surfaces loudly rather
than shipping as a dead link.

Non-UK sources (WIPO, EUR-Lex, CURIA, BAILII) are not fetched -- they have no
stable machine-readable heading endpoint. Those keep titleVerified: false and
should be spot-checked by hand.

Usage:  python3 scripts/verify_provisions.py [--only-missing]
"""
import json, re, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from html import unescape

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "content/provisions.json"
UA = {"User-Agent": "pebRevisionTools/0.1 (personal revision tool; contact via repo)"}
FETCHABLE = ("https://www.legislation.gov.uk/",)

# The "last <Title>" heuristic returns the heading of the last *section* in the
# document. That is correct for a single section or rule, and wrong for any
# container URL (whole Act, Part, or Schedule), where it silently returns the
# final child section instead. Verified failure: RDA Sch. A1 returned
# "Interpretation" rather than its real heading. So only auto-verify leaf
# provisions; containers are titled by hand in build_provisions.py.
LEAF = re.compile(r"/(section|rule|regulation|article)/[^/]+/?$")

def heading(url):
    """Return (heading, error). Heading is the last <Title> in the provision XML."""
    try:
        req = Request(url.rstrip("/") + "/data.xml", headers=UA)
        with urlopen(req, timeout=30) as r:
            xml = r.read().decode("utf-8", "replace")
    except HTTPError as e:
        return None, f"HTTP {e.code}"
    except (URLError, TimeoutError) as e:
        return None, f"network: {e}"
    titles = [t.strip() for t in re.findall(r"<Title>(.*?)</Title>", xml, re.S)]
    titles = [re.sub(r"<[^>]+>", "", t).strip() for t in titles]
    if not titles:
        return None, "no <Title> found"
    return unescape(titles[-1]).rstrip("."), None

def main():
    only_missing = "--only-missing" in sys.argv
    data = json.loads(DEST.read_text())
    targets = [p for p in data["provisions"]
               if p["url"].startswith(FETCHABLE)
               and LEAF.search(p["url"])
               and not p.get("titleVerified")
               and (p["title"] is None if only_missing else True)]
    skipped = [p["id"] for p in data["provisions"]
               if p["url"].startswith(FETCHABLE) and not LEAF.search(p["url"])]
    if skipped:
        print(f"container URLs skipped (title by hand): {', '.join(skipped)}")
    print(f"fetching {len(targets)} provisions from legislation.gov.uk ...")

    errors, changed, confirmed = [], [], 0
    def work(p):
        time.sleep(0.15)
        return p, *heading(p["url"])
    with ThreadPoolExecutor(max_workers=4) as ex:
        for p, h, err in ex.map(work, targets):
            if err:
                errors.append((p["id"], p["url"], err)); continue
            old = p["title"]
            p["title"], p["titleVerified"] = h, True
            if old is None:
                changed.append((p["id"], h))
            elif old.lower().rstrip(".") != h.lower():
                changed.append((p["id"], f"{old!r} -> {h!r}"))
            else:
                nonlocal_confirmed[0] += 1
    DEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    print(f"\nconfirmed unchanged : {nonlocal_confirmed[0]}")
    print(f"filled or corrected : {len(changed)}")
    for i, h in changed:
        print(f"   {i:<16} {h}")
    if errors:
        print(f"\nFAILED ({len(errors)}) -- likely wrong URL, check the citation:")
        for i, u, e in errors:
            print(f"   {i:<16} {e}  {u}")
    remaining = [p["id"] for p in data["provisions"] if not p.get("titleVerified")]
    print(f"\nunverified (non-UK sources, check by hand): {len(remaining)}")

nonlocal_confirmed = [0]
if __name__ == "__main__":
    main()
