/**
 * The prose notes were extracted from .docx paragraphs (scripts/parse_prose_notes.py)
 * and sometimes carry raw tab/newline runs from copy-pasted sub-lists
 * (e.g. "(a) ... \n\t(b) ..."). This does not rewrite wording — only
 * whitespace — since the words are what gets marked and must stay exact.
 */
export function normalizeNoteText(text: string): string {
  return text
    .replace(/\t+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
