/** Virtual multi-file project helpers for İnşa Et. Preview still bundles to one sandboxed HTML. */

import { sanitizeBuilderHtml } from "./builder-sanitize.ts";
import { looksLikeRawMarkup } from "./builder-quality.ts";
import { gateSummary, runFinalQualityGate } from "./builder-gate.ts";

export const MAX_FILE_CHARS = 80_000;
export const MAX_FILES = 16;
export const MAX_BUNDLE_CHARS = 420_000;

const ALLOWED_FILE = /^(index\.html|styles\.css|app\.js|schema\.sql|readme\.md|data\.json|[a-z0-9][a-z0-9-]{0,24}\.(html|css|js|svg|json|sql|md))$/i;

const SECRET = [
  /\bsk-[a-zA-Z0-9]{12,}/,
  /\bxai-[a-zA-Z0-9]{12,}/,
  /\bIYZICO[_A-Z]*\s*[:=]/i,
  /\bDATABASE_URL\s*[:=]/i,
  /\bXAI_API_KEY\b/,
  /\bELEVENLABS_API_KEY\b/,
  /\bBEGIN (RSA )?PRIVATE KEY\b/,
  /\bapi[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
  /\bsecret[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
  /\bbearer\s+[a-zA-Z0-9._\-]{20,}/i,
];

const STORE_SHIM =
  "var zunozaStore=(function(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};}};})();\n";

const NET_SHIM = `var zunozaFetch=function(){return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({ok:true,message:"Kaydedildi"});},text:function(){return Promise.resolve("Kaydedildi");}});};
var zunozaXhr=function(){this.readyState=4;this.status=200;this.responseText="{}";this.response="{}";this.open=function(){};this.setRequestHeader=function(){};this.abort=function(){};this.send=function(){var s=this;s.readyState=4;s.status=200;if(s.onreadystatechange)s.onreadystatechange();if(s.onload)s.onload();};};
var zunozaSocket=function(){this.readyState=3;this.send=function(){};this.close=function(){};this.addEventListener=function(){};this.removeEventListener=function(){};};
`;

export type BuilderFileMap = Record<string, string>;

export type BuilderJobReport = {
  ok: boolean;
  summary: string;
  files: string[];
  changed: string[];
  tests: { name: string; pass: boolean }[];
  issues: string[];
  manual: string[];
  log?: string[];
  failedStep?: string;
  retries?: number;
};

export function isAllowedBuilderPath(path: string) {
  const name = path.replace(/^\/+/, "").trim();
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  return ALLOWED_FILE.test(name);
}

export function repairNetworkApis(body: string) {
  let text = body;
  const needsNet = /\bfetch\s*\(|XMLHttpRequest|\bWebSocket\s*\(/.test(text);
  if (needsNet) {
    text = text.replace(/\bfetch\s*\(/g, "zunozaFetch(");
    text = text.replace(/\bnew\s+XMLHttpRequest\s*\(/g, "new zunozaXhr(");
    text = text.replace(/\bXMLHttpRequest\b/g, "zunozaXhr");
    text = text.replace(/\bnew\s+WebSocket\s*\(/g, "new zunozaSocket(");
    text = text.replace(/\bWebSocket\s*\(/g, "zunozaSocket(");
    if (!text.includes("var zunozaFetch=")) text = NET_SHIM + text;
  }
  if (/\bglobalThis\b/.test(text)) text = text.replace(/\bglobalThis\b/g, "window");
  return text;
}

export function repairFileBody(body: string) {
  let text = body.replace(/\u0000/g, "");
  const literalN = (text.match(/\\n/g) || []).length;
  const realN = (text.match(/\n/g) || []).length;
  if (literalN >= 4 && literalN > realN * 2) {
    text = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
  if (/\b(?:local|session)Storage\b/.test(text)) {
    text = text.replace(/\b(?:local|session)Storage\b/g, "zunozaStore");
    if (!text.includes("var zunozaStore=")) text = STORE_SHIM + text;
  }
  return repairNetworkApis(text);
}

const INTERACTIVE_SHIM = `(function(){
  function ready(fn){ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  ready(function(){
    document.querySelectorAll("form").forEach(function(f){
      f.addEventListener("submit", function(e){
        e.preventDefault();
        var data=[];
        Array.prototype.forEach.call(f.querySelectorAll("input,select,textarea"), function(el){
          if((el.id||el.name) && "value" in el && el.value) data.push(el.value);
        });
        var box=f.parentNode && f.parentNode.querySelector("ul,ol,.liste,#rez-list,#list");
        if(box){ var li=document.createElement("li"); li.textContent=data.join(" · ")||"Kaydedildi"; box.appendChild(li); }
        try { f.reset(); } catch (err) {}
      });
    });
    document.querySelectorAll("button").forEach(function(b){
      if(b.closest("form")) return;
      b.addEventListener("click", function(){});
    });
  });
})();
`;

export function repairBuilderFiles(files: BuilderFileMap): BuilderFileMap {
  const out: BuilderFileMap = {};
  for (const [name, body] of Object.entries(files)) {
    out[name] = repairFileBody(body);
  }
  const html = out["index.html"] || "";
  const js = `${out["app.js"] || ""}\n${html}`;
  const hasForm = /<form\b/i.test(html);
  const hasBehavior = /addEventListener|onclick\s*=|onsubmit\s*=|function\s+\w+|preventDefault/i.test(js);
  if (hasForm && !hasBehavior) {
    out["app.js"] = `${out["app.js"] || ""}\n${INTERACTIVE_SHIM}`.slice(0, MAX_FILE_CHARS);
  }
  if (html && !/viewport/i.test(html) && /<head[^>]*>/i.test(html)) {
    out["index.html"] = html.replace(/<head[^>]*>/i, (h) => `${h}<meta name="viewport" content="width=device-width, initial-scale=1">`);
  }
  return out;
}

export function normalizeFileMap(input: unknown): BuilderFileMap {
  const out: BuilderFileMap = {};
  if (!input || typeof input !== "object") return out;
  for (const [raw, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    const name = raw.replace(/^\/+/, "").trim();
    if (!isAllowedBuilderPath(name)) continue;
    const text = repairFileBody(value).slice(
... 