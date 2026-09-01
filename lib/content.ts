import "server-only";
import { cache } from "react";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");

// ------------------------------------------------------------- syllabus --

export interface LearningOutcome {
  letter: string;
  text: string;
  isApplication: boolean;
}

export interface SyllabusArea {
  number: number;
  slug: string;
  title: string;
  ipregTopics: string[];
  learningOutcomes: LearningOutcome[];
  provisions: string[];
  cases: string[];
  sourceNote?: string;
}

export interface ExamSection {
  id: string;
  questionNumbers: number[];
  totalMarks: number;
  answerAll: boolean;
  choose: number | null;
  marksPerQuestion: { min: number; max: number };
  character: string;
}

export interface SyllabusData {
  paperCode: string;
  title: string;
  syllabusYear: number;
  source: string;
  transcribedBy: string;
  verified: boolean;
  exam: {
    durationMins: number;
    totalMarks: number;
    passMark: number;
    closedBook: boolean;
    sections: ExamSection[];
    notes: string[];
  };
  areas: SyllabusArea[];
  sourceDiscrepancies?: Array<{
    area: number;
    syllabusSays: string;
    actual: string;
    resolution: string;
    verifiedOn: string;
  }>;
}

export const getSyllabus = cache((): SyllabusData => {
  const raw = fs.readFileSync(path.join(CONTENT, "syllabus/fc4.json"), "utf-8");
  return JSON.parse(raw) as SyllabusData;
});

export function getSyllabusArea(slug: string): SyllabusArea | undefined {
  return getSyllabus().areas.find((a) => a.slug === slug);
}

// ------------------------------------------------------------ provisions --

export interface Provision {
  id: string;
  instrument: string;
  citation: string;
  title: string | null;
  url: string;
  titleVerified: boolean;
}

export interface CaseEntry {
  id: string;
  label: string;
  court: string;
  year: number;
  url: string;
  note: string | null;
}

interface ProvisionsData {
  generatedBy: string;
  urlPatternsVerified: string;
  provisions: Provision[];
  cases: CaseEntry[];
}

export const getProvisionsData = cache((): ProvisionsData => {
  const raw = fs.readFileSync(path.join(CONTENT, "provisions.json"), "utf-8");
  return JSON.parse(raw) as ProvisionsData;
});

export const getProvisionsMap = cache((): Map<string, Provision> => {
  return new Map(getProvisionsData().provisions.map((p) => [p.id, p]));
});

export const getCasesMap = cache((): Map<string, CaseEntry> => {
  return new Map(getProvisionsData().cases.map((c) => [c.id, c]));
});

export function resolveProvisions(ids: string[]): Provision[] {
  const map = getProvisionsMap();
  return ids.map((id) => map.get(id)).filter((p): p is Provision => Boolean(p));
}

export function resolveCases(ids: string[]): CaseEntry[] {
  const map = getCasesMap();
  return ids.map((id) => map.get(id)).filter((c): c is CaseEntry => Boolean(c));
}

// -------------------------------------------------------------- prose notes --

export interface NoteEntry {
  text: string;
  bullet: boolean;
}

export interface ProseSubsection {
  heading: string;
  body: NoteEntry[];
}

export interface ProseOutcome {
  letter: string;
  docHeading: string;
  styledAsHeading: boolean;
  syllabusMatch: number;
  body: NoteEntry[];
  subsections: ProseSubsection[];
}

export interface ProseArea {
  number: number;
  docHeading: string;
  slug: string | null;
  intro: NoteEntry[];
  outcomes: ProseOutcome[];
}

interface ProseNotesData {
  generatedBy: string;
  source: string;
  areas: ProseArea[];
  tables: string[][][];
}

export const getProseNotes = cache((): ProseNotesData => {
  const raw = fs.readFileSync(path.join(CONTENT, "notes/fc4-notes.json"), "utf-8");
  return JSON.parse(raw) as ProseNotesData;
});

export function getProseNotesForArea(number: number): ProseArea | undefined {
  return getProseNotes().areas.find((a) => a.number === number);
}

// ------------------------------------------------------------------ cards --

export interface Card {
  id: string;
  question: string;
  answer: NoteEntry[];
  heading: string | null;
  sourceFile: string;
  areas: string[];
  reviewStatus: "proposed" | "confirmed" | "corrected" | "rejected";
  verified: boolean;
}

interface CardsData {
  generatedBy: string;
  cardCount: number;
  cards: Card[];
}

export const getCards = cache((): Card[] => {
  const raw = fs.readFileSync(path.join(CONTENT, "notes/fc4-cards.json"), "utf-8");
  return (JSON.parse(raw) as CardsData).cards;
});

export function getCardsForArea(slug: string): Card[] {
  return getCards().filter((c) => c.areas.includes(slug));
}

// ------------------------------------------------------------ supplements --

export interface Supplement {
  filename: string;
  area: number;
  areaSlug: string;
  outcome: string;
  title: string;
  provisions: string[];
  verified: boolean;
  writtenBy: string;
  sources: string[];
  why: string;
  body: string; // markdown, frontmatter stripped
}

export const getSupplements = cache((): Supplement[] => {
  const dir = path.join(CONTENT, "notes/supplements");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((filename) => {
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      const { data, content } = matter(raw);
      return {
        filename,
        area: data.area,
        areaSlug: data.areaSlug,
        outcome: data.outcome,
        title: data.title,
        provisions: data.provisions ?? [],
        verified: Boolean(data.verified),
        writtenBy: data.writtenBy ?? "unknown",
        sources: data.sources ?? [],
        why: data.why ?? "",
        body: content.trim(),
      } satisfies Supplement;
    });
});

export function getSupplementsForArea(number: number): Supplement[] {
  return getSupplements().filter((s) => s.area === number);
}

// -------------------------------------------------------------- area bundle --

export interface OutcomeBundle {
  outcome: LearningOutcome;
  prose: ProseOutcome | null;
  supplements: Supplement[];
  /** true when nothing at all exists for this outcome — render a gap marker. */
  isGap: boolean;
  /** true when the prose was recovered from unstyled body text, not a heading. */
  looselyAttributed: boolean;
}

export interface AreaBundle {
  area: SyllabusArea;
  proseArea: ProseArea | undefined;
  outcomes: OutcomeBundle[];
  cards: Card[];
  provisions: Provision[];
  cases: CaseEntry[];
}

export const getAreaBundle = cache((slug: string): AreaBundle | undefined => {
  const area = getSyllabusArea(slug);
  if (!area) return undefined;

  const proseArea = getProseNotesForArea(area.number);
  const supplements = getSupplementsForArea(area.number);

  const outcomes: OutcomeBundle[] = area.learningOutcomes.map((outcome) => {
    const prose = proseArea?.outcomes.find((o) => o.letter === outcome.letter) ?? null;
    const outcomeSupplements = supplements.filter((s) => s.outcome === outcome.letter);
    const hasProseContent = Boolean(
      prose && (prose.body.length > 0 || prose.subsections.length > 0),
    );
    return {
      outcome,
      prose,
      supplements: outcomeSupplements,
      isGap: !outcome.isApplication && !hasProseContent && outcomeSupplements.length === 0,
      looselyAttributed: Boolean(prose && !prose.styledAsHeading),
    };
  });

  return {
    area,
    proseArea,
    outcomes,
    cards: getCardsForArea(slug),
    provisions: resolveProvisions(area.provisions),
    cases: resolveCases(area.cases),
  };
});

export function getAllAreaBundles(): AreaBundle[] {
  return getSyllabus()
    .areas.map((a) => getAreaBundle(a.slug))
    .filter((b): b is AreaBundle => Boolean(b));
}
