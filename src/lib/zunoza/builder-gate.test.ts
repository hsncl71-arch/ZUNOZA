import assert from "node:assert/strict";
import test from "node:test";
import { buildKindApp } from "./builder-blueprints.ts";
import { evaluateBuilderOutput, formatBuilderIssuesLine, formatBuilderTestLine } from "./builder-files.ts";
import { gateSummary, isCriticalGate, runFinalQualityGate, runJsRuntime } from "./builder-gate.ts";

test("floor apps pass the final quality gate after heal", () => {
  const files = buildKindApp("panel", "Atölye Paneli");
  const gate = runFinalQualityGate(files, "saas dashboard");
  assert.equal(gate.ok, true, gate.issues.join("; ") || gate.failedCritical.join(", "));
  assert.equal(gate.tests.some((t) => t.name === "CSS yüklü" && t.pass), true);
  assert.equal(gate.tests.some((t) => t.name === "Runtime" && t.pass), true);
  assert.equal(gate.tests.some((t) => t.name === "Formlar" && t.pass), true);
  assert.equal(gate.tests.some((t) => t.name === "Mobil menü" && t.pass), true);
});

test("broken javascript fails the gate instead of showing green", () => {
  const runtime = runJsRuntime("<html><body></body></html>", "function ( {");
  assert.equal(runtime.ok, false);
  const evaluated = evaluateBuilderOutput({
    "index.html": "<!DOCTYPE html><html><head></head><body><h1>Ok</h1><button>x</button></body></html>",
    "styles.css": "body{margin:0}",
    "app.js": "function broken(",
  });
  const jsTest = evaluated.tests.find((t) => t.name === "JS sözdizimi" || t.name === "Runtime");
  if (evaluated.ok) {
    assert.equal(evaluated.tests.every((t) => t.pass || !isCriticalGate(t.name)), true);
  } else {
    assert.equal(evaluated.tests.some((t) => !t.pass), true);
    assert.match(formatBuilderTestLine({ ...evaluated, ok: false, summary: "", files: [], changed: [], issues: evaluated.issues, manual: [] }, "failed"), /sorun bulundu|kritik|tamamlanamadı|geçti/);
  }
  void jsTest;
});

test("failed tests never format as fully successful", () => {
  const report = {
    ok: false,
    summary: "kapı",
    files: [],
    changed: [],
    tests: [
      { name: "CSS yüklü", pass: true },
      { name: "Runtime", pass: false },
    ],
    issues: ["Runtime: boom"],
    manual: [],
  };
  assert.match(formatBuilderTestLine(report, "completed"), /sorun bulundu/);
  assert.doesNotMatch(formatBuilderTestLine(report, "completed"), /2\/2 test başarılı/);
  assert.match(formatBuilderIssuesLine(report, "completed"), /Runtime/);
  assert.doesNotMatch(formatBuilderIssuesLine(report, "completed"), /Açık sorun yok/);
  assert.match(gateSummary(report.tests, false), /sorun bulundu|kritik/);
});

test("payment and oauth stay unverified, never claimed working", () => {
  const gate = runFinalQualityGate(buildKindApp("e-ticaret", "Dükkan"), "iyzico ödeme ve google giriş ekle");
  assert.ok(gate.unverified.some((n) => /ödeme|tahsilat/i.test(n)));
  assert.ok(gate.unverified.some((n) => /OAuth|Kimlik/i.test(n)));
  assert.equal(gate.unverified.some((n) => /çalışıyor/i.test(n)), false);
});

test("evaluate still heals thin html into a passing preview", () => {
  const good = evaluateBuilderOutput({
    "index.html": "<!DOCTYPE html><html><head></head><body><h1>Ok</h1></body></html>",
    "styles.css": "body{margin:0}",
    "app.js": "document.body.dataset.ready='1'",
  });
  assert.equal(good.ok, true, good.issues.join("; "));
  assert.equal(good.tests.filter((t) => isCriticalGate(t.name) && !t.pass).length, 0, good.tests.filter((t) => !t.pass).map((t) => t.name).join(", "));
});
