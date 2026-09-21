import assert from "node:assert/strict";
import test from "node:test";
import {
  bundleBuilderFiles,
  checkBuilderFiles,
  evaluateBuilderOutput,
  formatBuilderIssuesLine,
  formatBuilderTestLine,
  isAllowedBuilderPath,
  mergeBuilderFiles,
  normalizeBuilderReport,
  parseFilesPayload,
  repairBuilderFiles,
  scanSecrets,
} from "./builder-files.ts";

test("rejects path traversal and unknown extensions", () => {
  assert.equal(isAllowedBuilderPath("index.html"), true);
  assert.equal(isAllowedBuilderPath("data.json"), true);
  assert.equal(isAllowedBuilderPath("schema.sql"), true);
  assert.equal(isAllowedBuilderPath("../secret.env"), false);
  assert.equal(isAllowedBuilderPath("app.ts"), false);
  assert.equal(isAllowedBuilderPath("pages/about.html"), false);
});

test("parses multi-file payload and merges only changed files", () => {
  const parsed = parseFilesPayload(`\`\`\`json
{"files":{"styles.css":"body{color:red}"},"changed":["styles.css"],"summary":"renk"}
\`\`\``);
  assert.ok(parsed);
  const merged = mergeBuilderFiles(
    { "index.html": "<html><body>ok</body></html>", "styles.css": "body{color:blue}" },
    parsed!.files,
  );
  assert.match(merged["styles.css"], /red/);
  assert.match(merged["index.html"], /ok/);
});

test("bundles css/js into index without network", () => {
  const bundled = bundleBuilderFiles({
    "index.html": "<!DOCTYPE html><html><head></head><body><h1>Mağaza</h1></body></html>",
    "styles.css": "body{margin:0}",
    "app.js": "document.body.dataset.ready='1'",
  });
  assert.equal(bundled.ok, true);
  assert.match(bundled.html, /zunoza-bundle-css/);
  assert.match(bundled.html, /zunoza-bundle-js/);
});

test("inlines css/js even when index links to external files", () => {
  const bundled = bundleBuilderFiles({
    "index.html": `<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Ok</h1><script src="app.js"></script></body></html>`,
    "styles.css": "body{color:#111;font-family:sans-serif}",
    "app.js": "document.body.dataset.on='1'",
  });
  assert.match(bundled.html, /zunoza-bundle-css/);
  assert.match(bundled.html, /zunoza-bundle-js/);
  assert.doesNotMatch(bundled.html, /href=["']styles\.css["']/);
  assert.doesNotMatch(bundled.html, /src=["']app\.js["']/);
});

test("inlines every local css/js file, not only styles.css", () => {
  const bundled = bundleBuilderFiles({
    "index.html": "<!DOCTYPE html><html><head></head><body></body></html>",
    "theme.css": "h1{color:red;font-family:serif}",
    "boot.js": "window.booted=1",
  });
  assert.match(bundled.html, /h1\{color:red/);
  assert.match(bundled.html, /window\.booted=1/);
});

test("bundle preserves $$ helpers instead of collapsing them via String.replace", () => {
  const bundled = bundleBuilderFiles({
    "index.html": "<!DOCTYPE html><html><head></head><body><h1>Ok</h1></body></html>",
    "styles.css": "body{margin:0;font-family:sans-serif}",
    "app.js": "const $=x=>x; const $$=x=>[x]; window.n=$$('a').length;",
  });
  assert.match(bundled.html, /const \$\$=/);
});

test("recovers files from truncated model JSON", () => {
  const parsed = parseFilesPayload(`{"files":{"index.html":"<!DOCTYPE html><html><body>Hi</body></html>","styles.css":"body{margin:0"}`);
  assert.ok(parsed);
  assert.match(parsed!.files["index.html"] || "", /Hi/);
});

test("secret scan blocks api keys", () => {
  const hits = scanSecrets({ "app.js": "const k='sk-abcdefghijklmnopqrst'" });
  assert.ok(hits.length > 0);
});

test("interactive markup without behavior is flagged, with listeners it passes", () => {
  const dead = checkBuilderFiles({
    "index.html": "<!DOCTYPE html><html><body><button>Kaydet</button><form><input></form></body></html>",
  });
  assert.equal(dead.tests.some((t) => t.name === "Etkileşim" && !t.pass), true);
  const live = checkBuilderFiles({
    "index.html": `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"></head><body><button id="b">Kaydet</button><form id="f"><input></form></body></html>`,
    "app.js": "b.addEventListener('click',()=>{}); 
... 