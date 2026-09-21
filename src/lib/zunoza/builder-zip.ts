/** Uncompressed ZIP for İnşa Et export. No extra dependency. */

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]!;
    for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  return [n & 255, (n >>> 8) & 255];
}
function u32(n: number) {
  return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
}

export function zipUtf8Files(files: Record<string, string>): Uint8Array {
  const parts: number[] = [];
  const central: number[] = [];
  let offset = 0;
  let count = 0;
  const encoder = new TextEncoder();
  for (const [rawName, body] of Object.entries(files)) {
    const name = rawName.replace(/^\/+/, "").slice(0, 80);
    if (!name || name.includes("..") || name.includes("\\") || name.includes("/")) continue;
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(body);
    const crc = crc32(data);
    const local = [0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), 0, 0];
    parts.push(...local, ...nameBytes, ...data);
    central.push(
      0x50, 0x4b, 0x01, 0x02, 0x14, 0, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length),
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(offset), ...nameBytes,
    );
    offset += local.length + nameBytes.length + data.length;
    count += 1;
    if (count >= 16) break;
  }
  const end = [0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, ...u16(count), ...u16(count), ...u32(central.length), ...u32(offset), 0, 0];
  return Uint8Array.from([...parts, ...central, ...end]);
}

export function downloadZip(name: string, files: Record<string, string>) {
  const bytes = zipUtf8Files(files);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w\-]+/g, "-").slice(0, 40) || "zunoza-proje"}.zip`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}
