import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBuilderOutput } from "./builder-files.ts";
import { buildPreviewDocument, previewIsInteractive, previewDocumentReady } from "./builder-quality.ts";
import { publicBuilderFailMessage } from "./builder-agent.ts";

test("preview pipeline heals thin/broken input into an interactive app instead of failing", () => {
  const thin = evaluateBuilderOutput(
    { "index.html": "<h1>Uygulama</h1><button>A</button>" },
    "organik gıda e-ticaret mağazası",
  );
  assert.equal(thin.ok, true, thin.issues.join("; "));
  assert.equal(previewDocumentReady(thin.html), true);
  assert.equal(previewIsInteractive(thin.html), true);
  assert.match(thin.html, /zunoza-bundle-css/);
  assert.match(thin.html, /zunoza-bundle-js/);
  assert.match(thin.html, /<button/i);
  assert.match(thin.html, /hashchange|data-go/);
  assert.doesNotMatch(thin.html, /logo\.png/);
});

test("fetch in generated code is stubbed and does not fail the preview gate", () => {
  const ev = evaluateBuilderOutput(
    {
      "index.html": `<!DOCTYPE html><html><body><div class="app-shell"><nav><button data-go="panel">Panel</button></nav><form><input><button>Kaydet</button></form></div></body></html>`,
      "styles.css": "body{margin:0;font-family:sans-serif}button{min-height:44px}.app-shell{display:flex;gap:8px;padding:12px;overflow-x:hidden}",
      "app.js": "fetch('/api'); window.addEventListener('hashchange', function(){});",
    },
    "panel",
  );
  assert.equal(ev.ok, true, ev.issues.join("; "));
  assert.equal(previewIsInteractive(ev.html), true);
});

test("broken asset pages keep a data image after heal", () => {
  const preview = buildPreviewDocument({
    "index.html": `<!DOCTYPE html><html><body><div class="app-shell"><img src="logo.png" alt="logo"><h1>Marka</h1></div></body></html>`,
    "styles.css": "body{margin:0;font-family:sans-serif;background:#000;color:#fff}.app-shell{display:grid;gap:12px;padding:16px}button{border:0}",
  });
  assert.equal(preview.ok, true);
  assert.equal(/src=["']logo\.png["']/.test(preview.html), false);
  assert.match(preview.html, /data:image\/svg\+xml/);
  assert.equal(previewIsInteractive(preview.html), true);
});

test("empty issues no longer hide a salvageable preview behind a generic fail", () => {
  assert.match(publicBuilderFailMessage([]), /Mevcut çalışmanız korundu|Proje oluşturulurken/);
  assert.match(publicBuilderFailMessage(["İnşa işlemi çok uzun sürdü."]), /uzun sürdü|Önizleme|çalışırlık|güvenlik/i);
});
