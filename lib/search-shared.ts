/**
 * Types and config shared between the server-side index builder
 * (lib/search-index.ts, which reads content/ off disk and is guarded by
 * "server-only") and the client palette, which needs the *value*
 * SEARCH_OPTIONS at runtime to call MiniSearch.loadJSON(json, SEARCH_OPTIONS).
 * Kept in its own file with no "server-only" import so it's safe in both
 * bundles — putting it in search-index.ts broke the client build, since a
 * "server-only"-guarded module can't be imported for a real value from a
 * "use client" component.
 */
import type { Options } from "minisearch";

export interface SearchDoc {
  id: string;
  type: "area" | "outcome" | "provision" | "case" | "card";
  title: string;
  subtitle: string;
  text: string;
  /** Internal route, or an external legislation/case URL for provisions & cases. */
  href: string;
  external: boolean;
}

export const SEARCH_OPTIONS: Options<SearchDoc> = {
  idField: "id",
  fields: ["title", "subtitle", "text"],
  storeFields: ["type", "title", "subtitle", "href", "external"],
  searchOptions: {
    boost: { title: 3, subtitle: 1.5 },
    prefix: true,
    fuzzy: 0.2,
  },
};
