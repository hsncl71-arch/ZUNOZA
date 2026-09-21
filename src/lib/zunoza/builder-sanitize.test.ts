import assert from "node:assert/strict";
import test from "node:test";
import { extractHtml, looksLikeUndo, sanitizeBuilderHtml, suggestProjectName, displaySafeText } from "./builder-sanitize.ts";
import { DEFAULT_FEATURE_CREDITS } from "./credit-economy.ts";
import { repairFileBody, parseFilesPayload } from "./builder-files.ts";

test("suggests tesbih store name", () => {
  assert.equal(suggestProjectName("Bana tesbih satış sitesi yap"), "Tesbih Mağazam");
});

test("todo prompts stay todos, not leftover shop names", () => {
  assert.equal(suggestProjectName("Basit bir yapılacaklar listesi oluştur. Görev ekleme olsun."), "Yapılacaklar Listem");
});

test("rewrites sessionStorage so sandboxed preview can run", () => {
  const out = sanitizeBuilderHtml(
    "<!DOCTYPE html><html><head></head><body><script>sessionStorage.setItem('a','1')</script><p>görev listesi yeterince uzun içerik</p></body></html>",
  );
  assert.equal(out.html.includes("sessionStorage"), false);
  assert.match(out.html, /zunozaStore/);
});

test("extracts html fence and blocks fetch/parent", () => {
  const raw = "```html\n<html><body><script>fetch('/api')</script><p>ok</p></body></html>\n```";
  const html = extractHtml(raw);
  const out = sanitizeBuilderHtml(html);
  assert.equal(out.html.includes("fetch("), false);
  assert.match(out.html, /Content-Security-Policy/);
  assert.match(out.html, /<html/i);
});

test("undo phrases", () => {
  assert.equal(looksLikeUndo("Geri al"), true);
  assert.equal(looksLikeUndo("Bunu beğenmedim, geri al"), true);
  assert.equal(looksLikeUndo("Son yaptığını geri al"), true);
  assert.equal(looksLikeUndo("Öncekine dön"), true);
  assert.equal(looksLikeUndo("Bunu sevmedim"), true);
  assert.equal(looksLikeUndo("rengi mor yap"), false);
  assert.equal(looksLikeUndo("Ürün kartlarını değiştir"), false);
  assert.equal(looksLikeUndo("Bunu daha lüks yap"), false);
});

test("blocks window.open and leftover iframe tags", () => {
  const popup = sanitizeBuilderHtml(
    "<!DOCTYPE html><html><body><script>window.open('https://evil.example')</script><p>mağaza</p></body></html>",
  );
  assert.equal(popup.html.includes("window.open"), false);
  const leftover = sanitizeBuilderHtml(
    "<!DOCTYPE html><html><head></head><body><iframe src='https://evil.example'><p>mağaza içerik metni burada yeterince uzun</p></body></html>",
  );
  assert.equal(/<iframe/i.test(leftover.html), false);
});

test("builder credit prices match the economy table", () => {
  assert.equal(DEFAULT_FEATURE_CREDITS.builder_create, 2);
  assert.equal(DEFAULT_FEATURE_CREDITS.builder_edit, 1);
  assert.equal(DEFAULT_FEATURE_CREDITS.builder_publish, 0);
});

test("preview csp blocks network and parent escape", () => {
  const out = sanitizeBuilderHtml(
    "<!DOCTYPE html><html><body><p>mağaza içerik metni burada yeterince uzun olsun</p></body></html>",
  );
  assert.match(out.html, /connect-src 'none'/);
  assert.match(out.html, /form-action 'none'/);
  assert.match(out.html, /frame-src 'none'/);
});

test("blocks parent/top bracket access", () => {
  const out = sanitizeBuilderHtml(
    `<!DOCTYPE html><html><body><script>window["parent"].location='https://evil.example'</script><p>mağaza içerik metni burada yeterince uzun</p></body></html>`,
  );
  assert.equal(out.html.includes('window["parent"]'), false);
});

test("strips base href and meta refresh", () => {
  const out = sanitizeBuilderHtml(
    `<!DOCTYPE html><html><head><base href="https://evil.example"><meta http-equiv="refresh" content="0;url=https://evil.example"></head><body><p>mağaza içerik metni burada yeterince uzun olsun</p></body></html>`,
  );
  assert.equal(/<base/i.test(out.html), false);
  assert.equal(/http-equiv=["']?refresh/i.test(out.html), false);
});

test("does not treat ordinary function declarations as Function constructor", () => {
  const out = sanitizeBuilderHtml(`<!DOCTYPE html><html><body>
<script>
function addTask(){
  const box = document.getElementById('t');
}
document.getElementById('add').addEventListener('click', addTask);
</script>
<button id="add">Ekle</button>
<p>yapilacaklar listesi icin yeterince uzun metin burada duruyor</p>
</body></html>`);
  assert.equal(out.ok, true);
  assert.match(out.html, /function addTask/);
  assert.equal(out.html.includes("/*blocked*/ addTask"), false);
});

test("keeps safe onclick and strips parent escape handlers", () => {
  const safe = sanitizeBuilderHtml(
    `<!DOCTYPE html><html><body><button onclick="addTask()">Ekle</button><p>yapilacaklar listesi icin yeterince uzun metin burada</p></body></html>`,
  );
  assert.match(safe.html, /onclick="addTask\(\)"/);
  const bad = sanitizeBuilderHtml(
    `<!DOCTYPE html><html><body><button onclick="parent.location='https://evil.example'">X</button><p>yapilacaklar listesi icin yeterince uzun metin burada</p></body></htm
... 