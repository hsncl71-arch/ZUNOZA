import { completeBuilderPlan, inferAppKind, integrationNeeds, type BuilderPlan } from "./builder-architecture.ts";
import { analyzeBuildScope } from "./builder-studio.ts";
import type { BuilderFileMap } from "./builder-files.ts";

export type AgentInspect = {
  incremental: boolean;
  intent: string;
  files: string[];
  touch: string[];
  keep: string[];
  screens: string[];
  notes: string[];
  askUser: string[];
  activity: string[];
};

export function needsUserClarification(instruction: string) {
  const raw = String(instruction || "");
  if (/SEÇİLİ BÖLÜM|seçilen bölüm|seçili bölüm/.test(raw)) return false;
  const n = raw.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (n.length > 90) return false;
  const deictic = /(şuray[ıi]|surayi|buray[ıi]|şunu|sunu|şuras[ıi]|surasi|buras[ıi]|burasi|\bbunu\b)/i.test(n);
  if (!deictic) return false;
  const concrete =
    /menü|menu|başlık|baslik|ürün|urun|footer|header|kart|sayfa|renk|buton|düğme|dugme|mobil|nav|sepet|form|fiyat|görsel|gorsel|lüks|luks|premium|görünüm|gorumum/.test(
      n,
    );
  return !concrete;
}

export function isIncrementalInstruction(instruction: string, hasFiles: boolean) {
  if (!hasFiles) return false;
  const p = String(instruction || "").toLocaleLowerCase("tr-TR");
  if (/s[ıi]f[ıi]rdan|ba[şs]tan yap|yeni uygulama olu[şs]tur|tümünü yeniden|tumunu yeniden/.test(p)) {
    return false;
  }
  return true;
}

export function describeIntent(instruction: string) {
  const p = String(instruction || "").toLocaleLowerCase("tr-TR");
  if (/mobil|ta[şs]ma|overflow|responsive/.test(p)) return "mobil görünüm düzeltmesi";
  if (/menü|menu|nav/.test(p) && /düzelt|duzelt|de[ğg]i[şs]/.test(p)) return "menü düzeltmesi";
  if (/ödeme|odeme|sepet|checkout|iyzico|stripe/.test(p)) return "ödeme/sepet ekleme";
  if (/giri[şs]|kay[ıi]t|üyelik|uyelik|login|auth/.test(p)) return "kimlik doğrulama ekleme";
  if (/renk|font|bo[şs]luk|padding|görünüm|tasar/.test(p)) return "görünüm düzenlemesi";
  if (/hata|bozuk|çalışm|calism/.test(p)) return "hata düzeltmesi";
  if (/sayfa|ekran ekle/.test(p)) return "yeni ekran ekleme";
  const clipped = String(instruction || "").replace(/\s+/g, " ").trim().slice(0, 72);
  return clipped || "mevcut uygulamayı geliştirme";
}

export function listAppScreens(files: BuilderFileMap) {
  const html = `${files["index.html"] || ""}\n${Object.entries(files)
    .filter(([n]) => n.endsWith(".html"))
    .map(([, b]) => b)
    .join("\n")}`;
  const fromData = [...html.matchAll(/data-screen=["']([^"']+)["']/g)].map((m) => m[1]);
  const fromHash = [...html.matchAll(/href=["']#\/?([a-z0-9_-]+)["']/gi)].map((m) => m[1]);
  const pages = Object.keys(files).filter((n) => n.endsWith(".html") && n !== "index.html").map((n) => n.replace(/\.html$/, ""));
  const uniq = [...new Set([...fromData, ...fromHash, ...pages])].filter(Boolean).slice(0, 12);
  return uniq;
}

export function selectFilesToTouch(files: BuilderFileMap, instruction: string) {
  const names = Object.keys(files);
  const has = (n: string) => names.includes(n);
  const pick = (...want: string[]) => {
    const hit = want.filter(has);
    return hit.length ? hit : names.slice(0, 6);
  };
  const p = String(instruction || "").toLocaleLowerCase("tr-TR");
  if (/SEÇİLİ BÖLÜM|seçilen bölüm|seçili bölüm/.test(instruction)) {
    if (/header|üst bilgi|hero|footer|menü|menu|nav|görünüm|premium|renk/.test(p)) {
      return pick("index.html", "styles.css");
    }
    return pick("index.html", "styles.css", "app.js");
  }
  const visual = /mobil|ta[şs]ma|padding|spacing|renk|font|görünüm|tasar[ıi]m|css|bo[şs]luk|kart/.test(p);
  const feature = /ekle|ödeme|odeme|sayfa|özellik|ozellik|giri[şs]|kay[ıi]t|form/.test(p);
  if (visual && !feature) return pick("styles.css", "index.html");
  if (/menü|menu|nav/.test(p) && !/ödeme|odeme/.test(p)) return pick("index.html", "styles.css", "app.js");
  if (/ödeme|odeme|sepet|checkout|iyzico|stripe/.test(p)) return pick("index.html", "app.js", "data.json", "styles.css");
  if (/giri[şs]|kay[ıi]t|login|auth/.test(p)) return pick("index.html", "app.js", "styles.css");
  if (/kart|ürün|urun|liste|görev|gorev|veri/.test(p)) return pick("index.html", "styles.css", "app.js", "data.json");
  if (/sayfa ekle|yeni sayfa|bölümü kaldır|bolumu kaldir/.test(p)) return pick("index.html", "app.js", "styles.css");
  if (/hata|bozuk|çalışm|calism/.test(p)) return pick("app.js", "index.html", "styles.css");
  return names.slice(0, 8);
}

export function credentialNeeds(instruction: string, plan?: BuilderPlan | null) {
  return integrationNeeds(instruction, plan);
}

export function inspectExistingApp(
  files: BuilderFileMap,
  instruction: string,
  plan?: BuilderPlan | null,
  previousTasks: string[] = [],
): AgentInspect {
  const names = Object.keys(files);
  const incremental = isIncrementalInstruction(instruction, names.length > 0);
  const intent = describeIntent(instruction);
  const touch = incremental ? selectFilesToTouch(files, instruction) : names.slice(0, 8);
  const keep = names.filter((n) => !touch.includes(n));
  const screens = listAppScreens(files);
  const notes = credentialNeeds(instruction, plan);
  const askUser = 
... 