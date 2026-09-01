"use server";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

const SUPPLEMENTS_DIR = path.join(process.cwd(), "content/notes/supplements");

export type CardConfidence = "again" | "hard" | "good" | "easy";

/**
 * Records (or updates) a self-test confidence rating for one flashcard.
 * Deliberately coarse — a signal for surfacing weak areas, not a
 * spaced-repetition scheduler (see docs/schema.sql, card_review).
 */
export async function recordCardReview(cardId: string, confidence: CardConfidence) {
  const db = getDb();
  db.prepare(
    `INSERT INTO card_review (card_id, confidence, reviewed_at, review_count)
     VALUES (?, ?, datetime('now'), 1)
     ON CONFLICT(card_id) DO UPDATE SET
       confidence = excluded.confidence,
       reviewed_at = datetime('now'),
       review_count = review_count + 1`,
  ).run(cardId, confidence);
}

/**
 * Flips a supplement's `verified: false` frontmatter to `true` once the user
 * has checked it against the source. Writes the .mdx file in place — these
 * are the user's own git-tracked content files, not derived/generated output.
 */
export async function markSupplementVerified(filename: string) {
  if (!/^[\w.-]+\.mdx$/.test(filename)) {
    throw new Error(`Refusing unexpected supplement filename: ${filename}`);
  }
  const filePath = path.join(SUPPLEMENTS_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  parsed.data.verified = true;
  const next = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, next, "utf-8");
  revalidatePath("/content", "layout");
}
