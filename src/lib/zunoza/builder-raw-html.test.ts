import assert from "node:assert/strict";
import test from "node:test";
import { unescapeBareMarkup } from "./builder-sanitize.ts";
import {
  buildPreviewDocument,
  jsSyntaxOk,
  looksLikeRawMarkup,
  previewDocumentReady,
} from "./builder-quality.ts";
import { evaluateBuilderOutput } from "./builder-files.ts";

const AMP = String.fromCharCode(38);

function escapeMarkup(html: string) {
  return html
    .split("<")
    .join(AMP + "lt;")
    .split(">")
    .join(AMP + "gt;")
    .split('"')
    .join(AMP + "quot;");
}

function assertRenderedApp(html: string, label: string) {
  assert.equal(previewDocumentReady(html), true, `${label}: previewDocumentReady`);
  assert.equal(looksLikeRawMarkup(html, html), false, `${label}: not raw`);
  assert.match(html, /<style[\s>]|zunoza-bundle-css/i, `${label}: style loaded`);
  assert.match(html, /font-family/i, `${label}: font-family`);
  assert.match(html, /<html[\s>]/i, `${label}: real html tag`);
  assert.equal(html.includes(AMP + "lt;html"), false, `${label}: no escaped html`);
  assert.match(html, /zunoza-bundle-js|<script/i, `${label}: js loaded`);
}

test("escaped markup is unescaped instead of shown as source", () => {
  const raw = escapeMarkup("<!DOCTYPE html><html><body><h1>Mağaza</h1><button>Al</button></body></html>");
  assert.match(raw, new RegExp(AMP + "lt;html"));
  const undone = unescapeBareMarkup(raw);
  assert.match(undone, /<html>/i);
  assert.equal(undone.includes(AMP + "lt;html"), false);
});

test("regression: escaped full document does not survive as preview source", () => {
  const escaped = escapeMarkup(
    `<!DOCTYPE html><html><head><title>x</title></head><body><h1>Kaçışlı sayfa</h1><button>Tıkla</button></body></html>`,
  );
  const preview = buildPreviewDocument({ "index.html": escaped });
  assert.equal(preview.ok, true);
  assertRenderedApp(preview.html, "escaped");
});

test("regression: fragment with no css is healed then rebuilt", () => {
  const preview = buildPreviewDocument({
    "index.html": "<h1>Başlık</h1><button>Git</button>",
  });
  assert.equal(preview.ok, true);
  assertRenderedApp(preview.html, "fragment");
  assert.ok((preview.files["styles.css"] || "").length >= 180);
});

test("regression: linked css/js files are inlined so iframe can load them", () => {
  const preview = buildPreviewDocument({
    "index.html": `<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"></head><body><div class="app-shell"><nav><button data-go="panel">Panel</button></nav><main><h1>Panel</h1></main></div><script src="app.js"></script></body></html>`,
    "styles.css": "body{margin:0;font-family:sans-serif;background:#111;color:#fff}button{border-radius:8px} .app-shell{display:flex;gap:1rem;padding:1rem}",
    "app.js": "document.body.dataset.ready='1'; window.addEventListener('hashchange', function(){});",
  });
  assert.equal(preview.ok, true);
  assert.equal(/href=["']styles\.css["']/.test(preview.html), false);
  assert.equal(/src=["']app\.js["']/.test(preview.html), false);
  assertRenderedApp(preview.html, "linked");
});

test("regression: broken js is replaced, preview still renders", () => {
  assert.equal(jsSyntaxOk("function x( {"), false);
  const preview = buildPreviewDocument({
    "index.html": "<!DOCTYPE html><html><body><div class='app-shell'><h1>Uygulama</h1><button>x</button></div></body></html>",
    "styles.css": "body{margin:0;font-family:Inter,sans-serif}button{padding:8px} .app-shell{display:grid;gap:8px}",
    "app.js": "function broken( {",
  });
  assert.equal(preview.ok, true);
  assert.match(preview.files["app.js"] || "", /hashchange/);
  assertRenderedApp(preview.html, "broken-js");
});

test("regression: broken asset path is inlined, not left as a dead relative url", () => {
  const preview = buildPreviewDocument({
    "index.html": `<!DOCTYPE html><html><body><div class="app-shell"><img src="logo.png" alt="logo"><h1>Marka</h1></div></body></html>`,
    "styles.css": "body{margin:0;font-family:sans-serif;background:#000;color:#fff}.app-shell{display:grid;gap:12px;padding:16px}button{border:0}",
  }
... 