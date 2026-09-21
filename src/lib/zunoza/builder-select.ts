export const BUILDER_SELECT_EVENT = "zunoza-builder-select";

export type BuilderPick = {
  label: string;
  tag: string;
  page: string;
  text: string;
};

export function parseBuilderSelectMessage(data: unknown): BuilderPick | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.type !== BUILDER_SELECT_EVENT) return null;
  const label = String(row.label || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!label) return null;
  return {
    label,
    tag: String(row.tag || "")
      .toLowerCase()
      .slice(0, 32),
    page: String(row.page || "").slice(0, 40),
    text: String(row.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280),
  };
}

export function formatSelectedEdit(instruction: string, pick?: BuilderPick | null) {
  const text = String(instruction || "").trim();
  if (!pick?.label) return text;
  return `[SEÇİLİ BÖLÜM: ${pick.label}]\n${text}\nBu değişikliği öncelikle seçilen bölümde uygula; diğer sayfa ve bileşenleri koru.`;
}

export function injectBuilderSelectScript(html: string) {
  const doc = String(html || "");
  if (!doc.trim() || /__zunozaPick/.test(doc)) return doc;
  const script = `<script>(function(){if(window.__zunozaPick)return;window.__zunozaPick=true;var last=null;function lab(el){var t=(el.tagName||"").toLowerCase();var page=el.getAttribute("data-page")||el.getAttribute("data-section")||"";if(t==="header"||page==="header")return "Üst bilgi (header)";if(t==="footer"||page==="footer")return "Alt bilgi (footer)";if(t==="nav"||page==="nav")return "Menü";if(/hero/i.test(el.className||"")||page==="hero")return "Hero alanı";var h=el.querySelector&&el.querySelector("h1,h2,h3");return (page||(h&&h.textContent)||t||"Bölüm").toString().replace(/\\s+/g," ").trim().slice(0,80);}document.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var el=e.target&&e.target.closest&&e.target.closest("header,footer,nav,section,main,form,article,[data-page],[data-section],.hero,.card,.app-top,.app-side");if(!el)return;if(last){last.style.outline="";last.style.outlineOffset="";}last=el;el.style.outline="2px solid #c45c26";el.style.outlineOffset="2px";parent.postMessage({type:${JSON.stringify(BUILDER_SELECT_EVENT)},tag:(el.tagName||"").toLowerCase(),page:el.getAttribute("data-page")||el.getAttribute("data-section")||"",label:lab(el),text:(el.innerText||"").slice(0,280)},"*");},true);})();</script>`;
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, `${script}</body>`);
  return doc + script;
}
