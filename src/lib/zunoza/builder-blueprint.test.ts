import assert from "node:assert/strict";
import test from "node:test";
import { inferAppKind } from "./builder-architecture.ts";
import { buildKindApp, isSparseApp, planAppArchitecture, skinForKind } from "./builder-blueprints.ts";
import { ensureAppQuality, scoreUiQuality } from "./builder-quality.ts";

test("kinds get distinct palettes and information architecture", () => {
  assert.equal(inferAppKind("online mağaza ve sepet"), "e-ticaret");
  assert.equal(inferAppKind("yapılacaklar listesi görev ekle"), "todo");
  const shop = skinForKind("e-ticaret");
  const dash = skinForKind("panel");
  const resto = skinForKind("rezervasyon");
  assert.notEqual(shop.accent, dash.accent);
  assert.notEqual(shop.bg, dash.bg);
  assert.notEqual(resto.accent, dash.accent);
  assert.notEqual(shop.accent, "#7b82ff");
  assert.notEqual(dash.accent, "#2563eb");
  const shopArch = planAppArchitecture("organik gıda mağazası");
  const dashArch = planAppArchitecture("saas yönetim paneli");
  assert.ok(shopArch.pages.some((p) => p.id === "sepet"));
  assert.ok(dashArch.pages.some((p) => p.id === "panel"));
  assert.notDeepEqual(shopArch.pages.map((p) => p.id), dashArch.pages.map((p) => p.id));
});

test("sparse two-button pages are rebuilt into a full app with states", () => {
  assert.equal(isSparseApp("<h1>Uygulama</h1><button>A</button><button>B</button>"), true);
  const files = ensureAppQuality(
    { "index.html": "<html><body><h1>Uygulama</h1><button>A</button><button>B</button></body></html>" },
    "organik gıda e-ticaret mağazası",
  );
  const html = files["index.html"] || "";
  const css = files["styles.css"] || "";
  const quality = scoreUiQuality(files);
  assert.equal(quality.ok, true, quality.issues.join("; "));
  assert.equal(isSparseApp(html), false);
  assert.match(html, /data-page="vitrin"/);
  assert.match(html, /data-page="sepet"/);
  assert.match(html, /state-empty/);
  assert.match(html, /state-loading/);
  assert.match(html, /state-error/);
  assert.match(css, /#c45c26/);
  assert.doesNotMatch(css, /#7b82ff/);
  assert.ok((html.match(/<article/g) || []).length >= 3);
});

test("restaurant and dashboard heals do not share the same chrome", () => {
  const resto = buildKindApp("rezervasyon", "Lokanta");
  const dash = buildKindApp("panel", "Yönetim");
  assert.match(resto["index.html"], /data-page="menu"/);
  assert.match(resto["index.html"], /data-page="hakkinda"/);
  assert.match(resto["index.html"], /data-section="header"/);
  assert.match(resto["index.html"], /data-section="footer"/);
  assert.match(dash["index.html"], /data-page="tablo"/);
  assert.notEqual(resto["styles.css"]?.includes("#7a1f2b"), false);
  assert.notEqual(dash["styles.css"]?.includes("#0f766e"), false);
  assert.doesNotMatch(resto["index.html"], /data-page="panel"/);
});

test("ungated apps still paint lists and hide extra pages", () => {
  const todo = buildKindApp("todo", "Görev Listesi");
  const shop = buildKindApp("e-ticaret", "Dükkan");
  assert.match(todo["styles.css"] || "", /\[hidden\]\s*\{/);
  assert.match(shop["styles.css"] || "", /\[hidden\]\s*\{/);
  const js = todo["app.js"] || "";
  const gated = js.indexOf('classList.contains("is-gated")');
  const early = js.indexOf("if (!authed) return");
  assert.ok(gated >= 0 && early > gated, "auth early-return must stay inside the gated branch");
  assert.match(js, /shell.hidden = !authed/);
  assert.match(todo["index.html"] || "", /data-page="liste"/);
  assert.match(todo["index.html"] || "", /data-act="add"/);
});

test("jewelry, grocery, company, and saas apps do not share chrome or catalog", () => {
  const jewel = buildKindApp("e-ticaret", "Atelier", "Modern ve premium bir kuyumcu web sitesi oluştur.");
  const grocer = buildKindApp("e-ticaret", "Dükkan", "organik gıda e-ticaret mağazası");
  const company = buildKindApp("landing", "Ajans", "Profesyonel şirket web sitesi oluştur.");
  const saas = buildKindApp("panel", "Yönetim", "Modern bir SaaS yönetim paneli oluştur.");
  assert.match(jewel["index.html"] || "", /Pırlanta Yüzük/);
  assert.match(jewel["styles.css"] || "", /#c9a227/);
  assert.doesNotMatch(jewel["styles.css"] || "", /#c45c26/);
  assert.match(grocer["index.html"] || "", /Zeytinyağı/);
  assert.match(grocer["styles.css"] || "", /#c45c26/);
  assert.match(company["index.html"] || "", /data-page="hakkinda"/);
  assert.match(company["index.html"] || "", /Hizmetler/);
  assert.match(saas["index.html"] || "", /data-page="panel"/);
  assert.notEqual(skinForKind("e-ticaret", "kuyumcu").accent, skinForKind("e-ticaret").accent);
});
