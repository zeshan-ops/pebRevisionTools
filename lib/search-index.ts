import "server-only";
import MiniSearch from "minisearch";
import { getSyllabus, getProvisionsData, getCards } from "@/lib/content";
import { SEARCH_OPTIONS, type SearchDoc } from "@/lib/search-shared";

function buildDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const syllabus = getSyllabus();
  const { provisions, cases } = getProvisionsData();
  const cards = getCards();

  for (const area of syllabus.areas) {
    docs.push({
      id: `area-${area.slug}`,
      type: "area",
      title: `${area.number} — ${area.title}`,
      subtitle: area.ipregTopics.join(" · "),
      text: area.learningOutcomes.map((o) => o.text).join(" "),
      href: `/content/${area.slug}`,
      external: false,
    });

    for (const outcome of area.learningOutcomes) {
      docs.push({
        id: `outcome-${area.slug}-${outcome.letter}`,
        type: "outcome",
        title: `${outcome.letter}) ${outcome.text}`,
        subtitle: `${area.number} — ${area.title}`,
        text: outcome.text,
        href: `/content/${area.slug}#outcome-${outcome.letter}`,
        external: false,
      });
    }
  }

  for (const p of provisions) {
    docs.push({
      id: `prov-${p.id}`,
      type: "provision",
      title: p.citation,
      subtitle: p.title ?? p.instrument,
      text: `${p.citation} ${p.instrument} ${p.title ?? ""}`,
      href: p.url,
      external: true,
    });
  }

  for (const c of cases) {
    docs.push({
      id: `case-${c.id}`,
      type: "case",
      title: c.label,
      subtitle: `${c.court} ${c.year}`,
      text: c.label,
      href: c.url,
      external: true,
    });
  }

  for (const card of cards) {
    const firstArea = card.areas[0];
    docs.push({
      id: `card-${card.id}`,
      type: "card",
      title: card.question,
      subtitle: card.heading ?? "Flashcard",
      text: `${card.question} ${card.answer.map((a) => a.text).join(" ")}`,
      href: firstArea ? `/content/${firstArea}#cards` : "/content",
      external: false,
    });
  }

  return docs;
}

/**
 * Builds the MiniSearch index server-side and serialises it for the client.
 * The client rehydrates via MiniSearch.loadJSON(json, SEARCH_OPTIONS) rather
 * than re-tokenising everything in the browser.
 */
export async function buildSearchIndex(): Promise<string> {
  const index = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  index.addAll(buildDocs());
  return JSON.stringify(index);
}
