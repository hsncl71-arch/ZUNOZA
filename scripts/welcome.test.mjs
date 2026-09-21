import assert from "node:assert/strict";
import test from "node:test";

const EXEMPT_PATHS = new Set([
  "/login",
  "/kullanim-kosullari",
  "/gizlilik",
  "/teslimat-iade",
  "/kvkk-aydinlatma",
  "/on-bilgilendirme",
  "/mesafeli-satis",
  "/hakkimizda",
  "/iletisim",
]);

function isWelcomeExemptPath(pathname) {
  return EXEMPT_PATHS.has(pathname);
}

function shouldShowWelcome({ signedIn, pending, dismissed, pathname }) {
  if (!signedIn || !pending || dismissed) return false;
  if (isWelcomeExemptPath(pathname)) return false;
  return true;
}

test("welcome shows only for new signed-in users", () => {
  assert.equal(shouldShowWelcome({ signedIn: true, pending: true, dismissed: false, pathname: "/" }), true);
  assert.equal(shouldShowWelcome({ signedIn: false, pending: true, dismissed: false, pathname: "/" }), false);
  assert.equal(shouldShowWelcome({ signedIn: true, pending: false, dismissed: false, pathname: "/" }), false);
});

test("welcome never returns after start", () => {
  assert.equal(shouldShowWelcome({ signedIn: true, pending: true, dismissed: true, pathname: "/" }), false);
  assert.equal(shouldShowWelcome({ signedIn: true, pending: false, dismissed: false, pathname: "/olustur" }), false);
});

test("welcome does not cover login or legal pages", () => {
  assert.equal(shouldShowWelcome({ signedIn: true, pending: true, dismissed: false, pathname: "/login" }), false);
  assert.equal(shouldShowWelcome({ signedIn: true, pending: true, dismissed: false, pathname: "/gizlilik" }), false);
});
