/** Native share / save. No-ops in the browser so web download path stays unchanged. */

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    let part = "";
    for (let j = 0; j < slice.length; j++) part += String.fromCharCode(slice[j]);
    binary += part;
  }
  return btoa(binary);
}

function safeNativeName(name: string) {
  return String(name || "zunoza.bin")
    .replace(/[/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80) || "zunoza.bin";
}

export async function shareNativeFile(
  file: File,
  title?: string,
): Promise<"share" | "cancel" | "skip"> {
  if (typeof window === "undefined") return "skip";
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return "skip";
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const buf = new Uint8Array(await file.arrayBuffer());
    const path = `zunoza-${Date.now()}-${safeNativeName(file.name)}`;
    const written = await Filesystem.writeFile({
      path,
      data: bytesToBase64(buf),
      directory: Directory.Cache,
    });
    await Share.share({
      title: title || "ZUNOZA",
      text: file.name,
      files: [written.uri],
      dialogTitle: "Kaydet / Paylaş",
    });
    return "share";
  } catch (err) {
    const text = err instanceof Error ? `${err.name} ${err.message}` : "";
    if (/abort|cancel|dismiss/i.test(text)) return "cancel";
    return "skip";
  }
}
