import { bundleBuilderFiles, type BuilderFileMap } from "./builder-files.ts";
import { sanitizeBuilderHtml, unescapeBareMarkup } from "./builder-sanitize.ts";
import { inferAppKind, type BuilderPlan } from "./builder-architecture.ts";
import { buildKindApp, isSparseApp, isSubstantialApp, kindCss } from "./builder-blueprints.ts";

function amp() {
  return String.fromCharCode(38);
}

function visibleMarkup(html: string) {
  return unescapeBareMarkup(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

export function looksLikeRawMarkup(html: string, css = "") {
  const unescaped = unescapeBareMarkup(html);
  const visible = visibleMarkup(unescaped);
  const entityOpen = amp() + "lt;";
  if (visible.includes(entityOpen)) return true;
  if (!unescaped.trim()) return true;
  const hasRealDom = /<(?:html|body|div|main|section|header|nav)\b/i.test(unescaped);
  if (!hasRealDom) return true;
  const textOnly = visible.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!textOnly) return true;
  const styleBlocks = unescaped.match(/<style\b[\s\S]*?<\/style>/gi) || [];
  const cssText = styleBlocks.join("\n") + "\n" + css;
  if (!/font-family/i.test(cssText) && !/font-family/i.test(unescaped)) return true;
  const cssLen = cssText.replace(/\s+/g, " ").trim().length;
  if (cssLen < 180 && !/zunoza-bundle-css/i.test(unescaped)) return true;
  if (/<(?:button|input|textarea|select)\b/i.test(unescaped) && !/button\s*\{|\.btn|input\s*\{/i.test(`${unescaped}\n${css}`)) {
    return true;
  }
  return false;
}

export function scoreUiQuality(files: BuilderFileMap) {
  const html = unescapeBareMarkup(files["index.html"] || "");
  const css = Object.entries(files).filter(([n]) => n.endsWith(".css")).map(([, b]) => b).join("\n");
  const js = Object.entries(files).filter(([n]) => n.endsWith(".js")).map(([, b]) => b).join("\n");
  const tests: { name: string; pass: boolean }[] = [];
  const issues: string[] = [];
  const raw = looksLikeRawMarkup(html, css);
  tests.push({ name: "CSS yüklü", pass: /font-family/i.test(css) && css.length >= 180 });
  if (!tests.at(-1)?.pass) issues.push("CSS uygulanmamış veya yetersiz; ham HTML görünür.");
  tests.push({ name: "Ham HTML değil", pass: !raw });
  if (raw) issues.push("Önizleme ham HTML / stillendirilmemiş sayfa görünümünde.");
  tests.push({ name: "Buton stili", pass: !/<(?:button|input)\b/i.test(html) || /button\s*\{|\.btn|input\s*\{/i.test(css) });
  if (!tests.at(-1)?.pass) issues.push("Tarayıcı varsayılan butonları duruyor.");
  tests.push({ name: "Yerleşim", pass: /display\s*:\s*(grid|flex)/i.test(css) && /padding|gap/i.test(css) });
  if (!tests.at(-1)?.pass) issues.push("Grid/flex ve boşluk sistemi yok.");
  tests.push({ name: "Navigasyon", pass: /<(?:nav|aside)\b|sidebar|menu|hashchange|#\//i.test(`${html}\n${js}`) });
  if (!tests.at(-1)?.pass) issues.push("Sayfa dolaşımı veya menü bulunamadı.");
  tests.push({ name: "JS runtime", pass: jsSyntaxOk(js) && (!/<(?:button|form|a)\b/i.test(html) || /addEventListener|hashchange|function\s+/i.test(js)) });
  if (!tests.at(-1)?.pass) issues.push("JavaScript etkileşimi yok veya sözdizimi bozuk.");
  tests.push({ name: "Kırık varlık yok", pass: !hasBrokenLocalAssets(html, files) });
  if (!tests.at(-1)?.pass) issues.push("Yerel asset yolu kırık; önizlemede yüklenmez.");
  tests.push({ name: "Sayfa derinliği", pass: (html.match(/data-page=/g) || []).length >= 3 });
  if (!tests.at(-1)?.pass) issues.push("Uygulama birkaç boş ekran; en az 3 sayfa/akış yok.");
  tests.push({ name: "Durumlar", pass: /state-empty|data-empty/.test(html) && /state-error/.test(html) && /state-loading/.test(html) });
  if (!tests.at(-1)?.pass) issues.push("Loading / empty / error durumları yok.");
  tests.push({ name: "Örnek veri", pass: (html.match(/<(?:article|tr)\b/gi) || []).length >= 3 });
  if (!tests.at(-1)?.pass) issues.push("Örnek içerik yetersiz; demo iskeleti gibi duruyor.");
  tests.push({ name: "Dokunma/taşma", pass: /min-height:\s*44px/i.test(css) && /ov
... 