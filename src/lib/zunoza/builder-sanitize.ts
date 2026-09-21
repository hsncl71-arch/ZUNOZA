const MAX_HTML = 420_000;

const FORBIDDEN = [
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<base\b/i,
  /<link\b[^>]*rel\s*=\s*["']?import/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /\bsrcdoc\s*=/i,
  /http-equiv\s*=\s*["']?refresh/i,
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/,
  /\bFunction\s*\(/,
  /\bwindow\.open\s*\(/i,
  /document\.cookie/i,
  /window\.parent/i,
  /window\.top/i,
  /window\.opener/i,
  /\bparent\.location\b/i,
  /\btop\.location\b/i,
  /XMLHttpRequest/i,
  /\bWebSocket\s*\(/i,
  /\bfetch\s*\(/i,
  /navigator\.serviceWorker/i,
  /document\.domain/i,
  /window\s*\[\s*['"`]parent['"`]\s*\]/i,
  /window\s*\[\s*['"`]top['"`]\s*\]/i,
  /globalThis/i,
  /\bimport\s*\(/i,
  /setTimeout\s*\(\s*['"`]/i,
  /document\.write/i,
];

const DANGEROUS_HANDLER =
  /javascript:|eval\s*\(|new\s+Function|Function\s*\(|parent\.location|top\.location|window\.parent|window\.top|window\.opener|document\.cookie|XMLHttpRequest|WebSocket\s*\(|fetch\s*\(/i;

const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src data: https: blob:; media-src data: https:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

const STORE_SHIM =
  "<script>var zunozaStore=(function(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};}};})();</script>";

const NET_SHIM =
  "<script>var zunozaFetch=function(){return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({ok:true,message:\"Kaydedildi\"});},text:function(){return Promise.resolve(\"Kaydedildi\");}});};var zunozaXhr=function(){this.readyState=4;this.status=200;this.responseText=\"{}\";this.open=function(){};this.send=function(){if(this.onload)this.onload();};this.setRequestHeader=function(){};};var zunozaSocket=function(){this.send=function(){};this.close=function(){};this.addEventListener=function(){};};</script>";

export { CSP as BUILDER_PREVIEW_CSP };

export function unescapeBareMarkup(html: string) {
  let text = String(html || "");
  for (let i = 0; i < 4; i++) {
    const hasReal = /<(?:html|body|div|style|script|head|!DOCTYPE)\b/i.test(text);
    const hasEscaped = /&lt;(?:\/?(?:html|body|div|style|script|head)|!DOCTYPE)/i.test(text);
    if (!hasEscaped) break;
    if (hasReal && !hasEscaped) break;
    text = text
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;|&apos;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&amp;/gi, "&");
  }
  return text;
}
  const text = raw.trim();
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const doc = text.match(/<!DOCTYPE html[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  if (doc) return doc[0].trim();
  return text;
}

export function parsePlanJson(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const text = (fenced?.[1] || raw).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as {
      name?: string;
      description?: string;
      pages?: string[];
      files?: string[];
      features?: string[];
      kind?: string;
      auth?: string;
      payments?: string;
      needs?: string[];
    };
  } catch {
    return null;
  }
}

export function suggestProjectName(prompt: string) {
  const p = prompt.toLocaleLowerCase("tr-TR");
  if (/yap[ıi]lacak|to-?do|g[öo]rev list|checklist/.test(p)) return "Yapılacaklar Listem";
  if (/tesbih/.test(p)) return "Tesbih Mağazam";
  if (/kuyumcu|mücevher|mucevher|takı|taki/.test(p)) return "Kuyumcu Sitem";
  if (/restoran|lokanta/.test(p)) return "Restoran Sitem";
  if (/randevu/.test(p)) return "Randevu Sistemim";
  if (/emlak/.test(p)) return "Emlak Sitem";
  if (/saas|yönetim paneli|yonetim paneli/.test(p)) return "Yönetim Panelim";
  if (/şirket|sirket|kurumsal/.test(p)) return "Şirket Sitem";
  if (/e-?ticaret|mağaza|magaza|satış|satis/.test(p)) return "Mağazam";
  if (/portföy|portfoy/.test(p)) return "Portföy Sitem";
  const words = prompt.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).slice(0, 4);
  if (!words.length) return "Yeni Uygulamam";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function stripDangerousHandlers(html: string) {
  return html.replace(/\son[a-z]+\s*=\s*(["'])([\s\S]*?)\1/gi, (full, _q, body) => {
    return DANGEROUS_HANDLER.test(String(body || "")) ? "" : full;
  });
}

function stubNetworkApis(html: string) {
  let text = html;
  const needsNet = /\bfetch\s*\(|XMLHttpRequest|\bWebSocket\s*\(/.test(text);
  if (needsNet) {
    te
... 