#!/usr/bin/env python3
"""Build content/provisions.json (the citation registry) from the syllabus.

Every provision id referenced by content/syllabus/*.json is resolved to a
citation label and a URL. URL patterns for the four UK instruments were
verified against legislation.gov.uk on 2026-09-01.

Titles marked "titleVerified": false are placeholders taken from the syllabus
table or left null. Run `verify_provisions.py` to replace them with the real
headings fetched from legislation.gov.uk.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# --- verified URL patterns -------------------------------------------------
LEG = "https://www.legislation.gov.uk"
RDA_BASE = f"{LEG}/ukpga/Geo6/12-13-14/88"   # Registered Designs Act 1949
CDPA_BASE = f"{LEG}/ukpga/1988/48"           # Copyright, Designs and Patents Act 1988
RDR_BASE = f"{LEG}/uksi/2006/1975"           # Registered Designs Rules 2006
WIPO = "https://www.wipo.int/wipolex/en/text"
EURLEX = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX"

# Section headings quoted directly in the FC4 syllabus table.
SYLLABUS_TITLES = {
    "rda-1": "Registration of designs",
    "rda-1b": "Requirement of novelty and individual character",
    "rda-1c": "Designs dictated by their technical function",
    "rda-1d": "Designs contrary to public policy or morality",
    "rda-2": "Proprietorship of designs",
    "rda-3": "Applications for registration",
    "rda-3c": "Date of registration of designs",
    "rda-7": "Right given by registration",
    "rda-7a": "Infringements of rights in registered designs",
    "rda-7b": "Right of prior use",
    "rda-8": "Duration of right in registered design",
    "rda-11": "Cancellation of registration",
    "rda-11za": "Grounds for invalidity of registration",
    "rda-11zb": "Applications for declaration of invalidity",
    "rda-11ze": "Effect of cancellation or invalidation of registration",
    "rda-14": "Convention applications",
    "rda-15a": "The nature of registered designs",
    "rda-15b": "Assignment etc of registered designs and applications for registered designs",
    "rda-15c": "Exclusive licences",
    "rda-19": "Registration of assignments etc",
    "rda-24a": "Action for infringement",
    "rda-24b": "Innocent infringement",
    "rda-24g": "Meaning of 'infringing article'",
    "rda-26": "Threats",
    "rda-35za": "Offence of unauthorised copying etc. of design in course of business",
    "rda-sch-a1": "Grounds for refusal of registration in relation to emblems etc.",
    "rda-sch-1a": "European Community registered designs",
    "rda-sch-1b": "International designs",
    "rda-35": "Fine for falsely representing a design as registered",
    "rdr-35": "Fine for falsely representing a design as registered",
    "cdpa-213": "Design right",
    "cdpa-214": "The designer",
    "cdpa-215": "Ownership of design right",
    "cdpa-216": "Duration of design right",
    "cdpa-222": "Assignment and licences",
    "cdpa-223": "Prospective ownership of design right",
    "cdpa-225": "Exclusive licences",
    "cdpa-51": "Design documents and models",
    "cdpa-226": "Primary infringement of design right",
    "cdpa-227": "Secondary infringement: importing or dealing with infringing article",
    "cdpa-228": "Meaning of 'infringing article'",
    "cdpa-229": "Rights and remedies of design right owner",
    "cdpa-233": "Innocent infringement",
    "cdpa-234": "Rights and remedies of exclusive licensee",
    "cdpa-235": "Exercise of concurrent rights",
    "cdpa-236": "Infringement of copyright",
    "cdpa-244a": "Exception for private acts, experiments and teaching",
    "cdpa-253": "Remedy for groundless threats of infringement proceedings",
    "cdpa-1": "Copyright and copyright works",
    "cdpa-2": "Rights subsisting in copyright works",
    "cdpa-3": "Literary, dramatic and musical works",
    "cdpa-4": "Artistic works",
    "cdpa-9": "Authorship of work",
    "cdpa-10": "Works of joint authorship",
    "cdpa-11": "First ownership of copyright",
    "cdpa-12": "Duration of copyright in literary, dramatic, musical or artistic works",
    "cdpa-77": "Right to be identified as author or director",
    "cdpa-80": "Right to object to derogatory treatment of work",
    "cdpa-16": "The acts restricted by copyright in a work",
    "cdpa-17": "Infringement of copyright by copying",
    "cdpa-18": "Infringement by issue of copies to the public",
    "cdpa-21": "Infringement by making adaptation etc.",
    "cdpa-27": "Meaning of 'infringing copy'",
    "cdpa-76": "Adaptations",
    "cdpa-96": "Infringement actionable by copyright owner",
    "cdpa-101": "Rights and remedies of exclusive licensee",
}

CASES = {
    "beverly-hills-teddy-bear": {
        "label": "Beverly Hills Teddy Bear Co v PMS International Group (C-728/19)",
        "court": "CJEU", "year": 2021,
        "url": "https://curia.europa.eu/juris/liste.jsf?num=C-728/19",
        "note": "Syllabus flags that following the amendment to EUDR art 110a(5) this may no longer be valid law.",
    },
    "samsung-v-apple": {
        "label": "Samsung Electronics (UK) Ltd v Apple Inc [2012] EWHC 1882",
        "court": "EWHC", "year": 2012,
        "url": "https://www.bailii.org/ew/cases/EWHC/Patents/2012/1882.html",
        "note": "General approach of the courts to individual character.",
    },
    "pepsico-v-grupo-promer": {
        "label": "PepsiCo Inc v Grupo Promer Mon Graphic SA (C-281/10 P)",
        "court": "CJEU", "year": 2011,
        "url": "https://curia.europa.eu/juris/liste.jsf?num=C-281/10",
        "note": "Approved in Samsung v Apple.",
    },
    "waterrower-v-liking": {
        "label": "WaterRower (UK) Ltd v Liking Ltd (T/A Topiom) [2024] EWHC 2806",
        "court": "EWHC", "year": 2024,
        "url": "https://www.bailii.org/ew/cases/EWHC/IPEC/2024/2806.html",
        "note": "Works of artistic craftsmanship; read with Cofemel.",
    },
    "cofemel-v-g-star": {
        "label": "Cofemel v G-Star Raw CV (C-683/17)",
        "court": "CJEU", "year": 2019,
        "url": "https://curia.europa.eu/juris/liste.jsf?num=C-683/17",
        "note": None,
    },
}

# Container URLs (whole Acts, Parts, Schedules). The verifier cannot resolve
# these -- see the LEAF note in verify_provisions.py -- so their titles are set
# here by hand. Schedule titles confirmed against legislation.gov.uk 2026-09-01.
CONTAINERS = {"rda-general", "rdr-general", "cdpa-designs-general",
              "cdpa-copyright-general", "rda-sch-a1", "rda-sch-1a", "rda-sch-1b"}

MANUAL = {
    "rda-general":            ("Registered Designs Act 1949", "RDA 1949", RDA_BASE),
    "rdr-general":           ("Registered Designs Rules 2006", "RDR 2006", RDR_BASE),
    "cdpa-designs-general":  ("Copyright, Designs and Patents Act 1988, Part III — Design right", "CDPA 1988 Pt III", f"{CDPA_BASE}/part/III"),
    "cdpa-copyright-general":("Copyright, Designs and Patents Act 1988, Part I — Copyright", "CDPA 1988 Pt I", f"{CDPA_BASE}/part/I"),
    "berne-art-1":  ("Berne Convention, Article 1", "Berne art 1", f"{WIPO}/283698"),
    "berne-art-5":  ("Berne Convention, Article 5", "Berne art 5", f"{WIPO}/283698"),
    "paris-art-1":  ("Paris Convention, Article 1", "Paris art 1", f"{WIPO}/288514"),
    "paris-art-4":  ("Paris Convention, Article 4 — right of priority", "Paris art 4", f"{WIPO}/288514"),
    "hague-common-regs":       ("Common Regulations under the 1999 and 1960 Acts of the Hague Agreement", "Hague Common Regs", "https://www.wipo.int/hague/en/legal_texts/"),
    "hague-admin-instructions":("Administrative Instructions for the Application of the Hague Agreement", "Hague Admin Instructions", "https://www.wipo.int/hague/en/legal_texts/"),
    "eudr-arts-1-14":  ("EU Design Regulation, Articles 1–14", "EUDR arts 1–14", f"{EURLEX}:32002R0006"),
    "eudr-art-3":      ("EU Design Regulation, Article 3 — definitions", "EUDR art 3", f"{EURLEX}:32002R0006"),
    "eudr-arts-19-21": ("EU Design Regulation, Articles 19–21", "EUDR arts 19–21", f"{EURLEX}:32002R0006"),
    "eudr-art-20a":    ("EU Design Regulation, Article 20a — repair clause", "EUDR art 20a", f"{EURLEX}:32024R2822"),
    "eudr-art-37":     ("EU Design Regulation, Article 37", "EUDR art 37", f"{EURLEX}:32002R0006"),
}

def hague_url():
    return f"{WIPO}/285259"

def build_entry(pid):
    # Hague articles
    m = re.fullmatch(r"hague-art-(\d+)", pid)
    if m:
        return dict(id=pid, instrument="Hague Agreement (Geneva Act 1999)",
                    citation=f"Hague art {m.group(1)}",
                    title=f"Hague Agreement (Geneva Act 1999), Article {m.group(1)}",
                    url=hague_url(), titleVerified=False)
    if pid == "hague-arts-7-16":
        return dict(id=pid, instrument="Hague Agreement (Geneva Act 1999)",
                    citation="Hague arts 7–16", title="Hague Agreement (Geneva Act 1999), Articles 7 to 16",
                    url=hague_url(), titleVerified=False)
    # Withdrawal Agreement
    m = re.fullmatch(r"wa-art-(\d+)", pid)
    if m:
        return dict(id=pid, instrument="EU Withdrawal Agreement (2019/C 384 I/01)",
                    citation=f"WA art {m.group(1)}",
                    title=f"Withdrawal Agreement, Title IV, Article {m.group(1)}",
                    url=f"{EURLEX}:12019W/TXT(02)", titleVerified=False)
    if pid in MANUAL:
        title, citation, url = MANUAL[pid]
        inst = ("Berne Convention" if pid.startswith("berne") else
                "Paris Convention" if pid.startswith("paris") else
                "Hague Agreement (Geneva Act 1999)" if pid.startswith("hague") else
                "Council Regulation (EC) 6/2002 (EUDR)" if pid.startswith("eudr") else
                "Registered Designs Act 1949" if pid.startswith("rda") else
                "Registered Designs Rules 2006" if pid.startswith("rdr") else
                "Copyright, Designs and Patents Act 1988")
        return dict(id=pid, instrument=inst, citation=citation, title=title,
                    url=url, titleVerified=pid in CONTAINERS)
    # RDA schedules
    m = re.fullmatch(r"rda-sch-(\w+)", pid)
    if m:
        s = m.group(1).upper()
        return dict(id=pid, instrument="Registered Designs Act 1949",
                    citation=f"RDA Sch. {s}", title=SYLLABUS_TITLES.get(pid),
                    url=f"{RDA_BASE}/schedule/{s}", titleVerified=pid in CONTAINERS)
    # RDA sections
    m = re.fullmatch(r"rda-(\w+)", pid)
    if m:
        s = m.group(1).upper()
        return dict(id=pid, instrument="Registered Designs Act 1949",
                    citation=f"RDA s.{s}", title=SYLLABUS_TITLES.get(pid),
                    url=f"{RDA_BASE}/section/{s}", titleVerified=False)
    # RDR rules
    m = re.fullmatch(r"rdr-(\w+)", pid)
    if m:
        s = m.group(1).upper()
        return dict(id=pid, instrument="Registered Designs Rules 2006",
                    citation=f"RDR r.{s}", title=SYLLABUS_TITLES.get(pid),
                    url=f"{RDR_BASE}/rule/{s}", titleVerified=False)
    # CDPA sections
    m = re.fullmatch(r"cdpa-(\w+)", pid)
    if m:
        s = m.group(1).upper()
        return dict(id=pid, instrument="Copyright, Designs and Patents Act 1988",
                    citation=f"CDPA s.{s}", title=SYLLABUS_TITLES.get(pid),
                    url=f"{CDPA_BASE}/section/{s}", titleVerified=False)
    raise SystemExit(f"unrecognised provision id: {pid}")

def main():
    ids, cases = set(), set()
    for f in sorted((ROOT / "content/syllabus").glob("*.json")):
        d = json.loads(f.read_text())
        for a in d["areas"]:
            ids.update(a["provisions"])
            cases.update(a["cases"])
    provisions = [build_entry(p) for p in sorted(ids)]
    for c in sorted(cases):
        if c not in CASES:
            raise SystemExit(f"unknown case: {c}")
    out = {
        "generatedBy": "scripts/build_provisions.py",
        "urlPatternsVerified": "2026-09-01 against legislation.gov.uk",
        "provisions": provisions,
        "cases": [dict(id=c, **CASES[c]) for c in sorted(cases)],
    }
    dest = ROOT / "content/provisions.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    untitled = [p["id"] for p in provisions if not p["title"]]
    print(f"wrote {dest.relative_to(ROOT)}: {len(provisions)} provisions, {len(out['cases'])} cases")
    print(f"titles still needed: {len(untitled)}")
    if untitled:
        print("  " + ", ".join(untitled))

if __name__ == "__main__":
    main()
