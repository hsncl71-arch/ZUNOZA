import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  extractPersonName,
  extractSavePayload,
  identityReply,
  isAboutMeQuestion,
  isAbusiveOrTransient,
  isCompanyQuestion,
  isIdentityCorrection,
  isIdentityQuestion,
  isJunkStoredMemory,
  isMemoryConfirmQuestion,
  isNameLike,
  isSideTalk,
  companyReply,
  extractCompany,
  isForgetCommand,
  isSensitiveMemory,
  isAckUtterance,
  isExplicitNameSave,
} from "@/lib/zunoza/memory-intent";
import { selectRelevantMemories } from "@/lib/zunoza/memory-select";

export type MemoryRow = { id: string; content: string; createdAt: string };
export {
  extractPersonName,
  extractSavePayload,
  identityReply,
  isIdentityQuestion,
  isAbusiveOrTransient,
  isIdentityCorrection,
  looksLikeMemoryCommand,
  companyReply,
  extractCompany,
  isForgetCommand,
  isSensitiveMemory,
  isAckUtterance,
  isExplicitNameSave,
} from "@/lib/zunoza/memory-intent";
export { selectRelevantMemories } from "@/lib/zunoza/memory-select";

const MAX_MEMORIES = 40;
const MAX_LEN = 400;
const MEMORY_CACHE_MS = 20_000;
const SCRUB_EVERY_MS = 5 * 60_000;
const memoryRowCache = new Map<string, { at: number; rows: MemoryRow[] }>();
const lastScrub = new Map<string, number>();

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export function memoryPromptBlock(rows: MemoryRow[]) {
  if (!rows.length) return "";
  const lines = rows
    .slice(0, MAX_MEMORIES)
    .map((row, i) => `${i + 1}. ${row.content}`)
    .join("\n");
  return `Bu sohbet için geri çağrılan ilgili kayıtlı notlar (uy, kullanıcıya tekrar sorma, çelişme, başkasına söyleme). Kullanıcıya “kaydettim” diye anons etme:\n${lines}`;
}

async function rowsFor(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
): Promise<MemoryRow[]> {
  const rows = await sql<{ id: string; content: string; created_at: Date | string }>`
    select id, content, created_at
    from user_memories
    where user_id = ${userId}
    order by created_at desc
    limit ${MAX_MEMORIES}
  `;
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at ?? ""),
  }));
}

async function scrubJunkMemories(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await rowsFor(sql, userId);
  const names = rows.filter((row) => extractPersonName(row.content) && !isJunkStoredMemory(row.content));
  for (const row of rows) {
    if (isJunkStoredMemory(row.content)) {
      await sql`delete from user_memories where id = ${row.id} and user_id = ${userId}`;
    }
  }
  if (
... 