import assert from "node:assert/strict";
import test from "node:test";
import { buildPreviewDocument, ensureAppQuality, looksLikeRawMarkup, scoreUiQuality } from "./builder-quality.ts";
import { evaluateBuilderOutput } from "./builder-files.ts";

test("thin html is healed into a real preview, never left as raw markup", () => {
  const thin = ensureAppQuality(
    {
      "index.html": "<html><body><h1>TEST-1</h1><button>x</button></body></html>",
    },
    "SaaS dashboard",
  );
  const quality = scoreUiQuality(thin);
  assert.equal(quality.raw, false);
  assert.ok((thin["styles.css"] || "").length > 220);
  assert.match(thin["styles.css"], /font-family/);
  assert.match(thin["app.js"] || "", /hashchange/);
  const preview = buildPreviewDocument(thin);
  assert.equal(preview.ok, true);
  assert.match(preview.html, /zunoza-bundle-css/);
  assert.match(preview.html, /<style/i);
  assert.equal(looksLikeRawMarkup(preview.html, preview.html), false);
  assert.equal(/&lt;html/.test(preview.html), false);
});

test("SaaS dashboard fixture has login, sidebar, stats, table, profile, settings, mobile menu", () => {
  const files = ensureAppQuality({}, "premium SaaS dashboard yönetim paneli");
  const html = files["index.html"] || "";
  const css = files["styles.css"] || "";
  const js = files["app.js"] || "";
  assert.match(html, /app-shell/);
  assert.match(html, /app-side/);
  assert.match(html, /data-page="panel"/);
  assert.match(html, /data-page="tablo"/);
  assert.match(html, /data-page="profil"/);
  assert.match(html, /data-page="ayarlar"/);
  assert.match(html, /menu-btn/);
  assert.match(html, /is-gated/);
  assert.match(html, /\bhidden\b/);
  assert.match(html, /data-auth-submit/);
  assert.match(html, /data-profile-email/);
  assert.match(html, /Şirket/);
  assert.match(css, /@media/);
  assert.match(css, /button/);
  assert.match(css, /\.hidden\s*\{/);
  assert.match(js, /hashchange/);
  assert.match(js, /loginFromForm/);
  const preview = buildPreviewDocument(files);
  assert.equal(preview.ok, true);
  const evaled = evaluateBuilderOutput(preview.files, "saas dashboard");
  assert.equal(evaled.tests.some((t) => t.name === "Sandbox HTML" && t.pass), true);
  for (const width of ["desktop", "tablet", "phone"]) {
    assert.ok(preview.html.includes("app-shell"), width);
  }
});
