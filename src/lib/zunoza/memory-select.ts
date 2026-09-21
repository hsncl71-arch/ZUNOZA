export type MemoryPick = { id: string; content: string; createdAt: string };

function tokens(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length >= 3);
}

export function selectRelevantMemories(rows: MemoryPick[], query: string) {
  if (!rows.length) return [];
  const always = rows.filter((row) =>
    /tercih|adım|adim|adı |adi |şirket|sirket|her zaman|bundan sonra|hitap|isim|kullanıcının adı|kullanicinin adi|kullanıcının şirketi|mezat/i.test(
      row.content,
    ),
  );
  const q = tokens(query);
  const scored = q.length
    ? rows
        .map((row) => ({
          row,
          score: tokens(row.content).filter((word) => q.includes(word)).length,
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.row)
    : [];
  const picked: MemoryPick[] = [];
  const seen = new Set<string>();
  const cap = 8;
  for (const row of [...always, ...scored]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    picked.push(row);
    if (picked.length >= cap) break;
  }
  return picked;
}
