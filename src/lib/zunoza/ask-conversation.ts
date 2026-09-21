import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { ChatMessage } from "@/lib/zunoza/assistant";
import { isAskAttachmentPath, persistableAskMessages, preserveAskImages, slimAskMessages } from "@/lib/zunoza/ask-thread";
import { parseImageDataUrl } from "@/lib/zunoza/image-request";
import { askAttachmentObjectKey, getR2Object, persistBytesToR2, r2ObjectKey, isR2ObjectRef } from "@/lib/zunoza/r2";

const ASSISTANT_WELCOME = "Merhaba, ben ZUNOZA. Yapay zekâ asistanınızım. Size nasıl yardımcı olabilirim?";

export function askAttachmentUrl(id: string) {
  return `/api/sor-ekler/${id}/indir`;
}

export function parseAskAttachmentId(url: string) {
  const match = String(url || "").trim().match(/^\/api\/sor-ekler\/([A-Za-z0-9-]+)\/indir(?:\?.*)?$/);
  return match?.[1] || "";
}

async function ensureConversation(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const [row] = await sql<{ id: string }>`
    insert into ask_conversations (id, user_id, messages_json)
    values (${crypto.randomUUID()}, ${userId}, ${"[]"})
    on conflict (user_id) do update set updated_at = now()
    returning id
  `;
  return row.id;
}

async function storeDataImage(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  conversationId: string,
  dataUrl: string,
) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return null;
  const id = crypto.randomUUID();
  const ext = parsed.mime.includes("png") ? "png" : parsed.mime.includes("webp") ? "webp" : "jpg";
  const stored = await persistBytesToR2(askAttachmentObjectKey(userId, id, ext), parsed.bytes, parsed.mime);
  if (!stored) return null;
  await sql`
    insert into ask_attachments (id, conversation_id, user_id, mime_type, byte_size, object_key)
    values (${id}, ${conversationId}, ${userId}, ${parsed.mime}, ${parsed.bytes.byteLength}, ${stored})
  `;
  return askAttachmentUrl(id);
}

export async function persistAskSnapshot(userId: string, messages: ChatMessage[]) {
  const sql = await getSql();
  const conversationId = await ensureConversation(sql, userId);
  const slim = slimAskMessages(messages, 4);
  const stored: ChatMessage[] = [];
  for (const row of slim) {
    const images: string[] = [];
    for (const url of row.images || []) {
      if (isAskAttachmentPath(url)) {
        const id = parseAskAttachmentId(url);
        if (!id) continue;
        const [owned] = await sql<{ id: string }>`
          select id from ask_attachments where id = ${id} and user_id = ${userId} limit 1
        `;
        if (owned) images.push(askAttachmentUrl(owned.id));
        continue;
      }
      if (url.startsWith("data:image/")) {
        const saved = await storeDataImage(sql, userId, conversationId, url);
        if (saved) images.push(saved);
      }
    }
    stored.push({
      role: row.role,
      content: row.content,
      images: images.length ? images : undefined,
    });
  }
  const [prev] = await sql<{ messages_json: string | null }>`
    select messages_json from ask_conversations where id = ${conversationId} and user_id = ${userId}
  `;
  let existing: ChatMessage[] = [];
  try {
    const parsed = JSON.parse(String(prev?.messages_json || "[]")) as ChatMessage[];
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }
  const merged = preserveAskImages(stored, existing);
  await sql`
    update ask_conversations
    set messages_json = ${JSON.stringify(merged)}, updated_at = now()
    where id = ${conversationId} and user_id = ${userId}
  `;
  return merged;
}

export async function hydrateAskImages(userId: string, messages: ChatMessage[]): Promise<ChatMessage[]> {
  const ids = messages.flatMap((m) => (m.images || []).map(parseAskAttachmentId).filter(Boolean));
  if (!ids.length) return messages;
  const sql = await getSql();
  const rows = await sql.query<{ id: string; object_key: string; mime_type: string }>(
    `select id, object_key, mime_type from ask_attachments
     where user_id = $1 and id = any($2::text[])`,
    [userId, ids],
  );
  const dataUrls = new Map<string, string>();
  for (const row of rows) {
    if (!isR2ObjectRef(row.object_key)) continue;
    const obj = await getR2Object(r2ObjectKey(row.object_key));
    if (!obj.ok || !("bytes" 
... 