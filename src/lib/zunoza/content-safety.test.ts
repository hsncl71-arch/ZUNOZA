import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSafeGeneration, isProhibitedGeneration } from "./content-safety.ts";

describe("content-safety", () => {
  it("allows ordinary creative prompts", () => {
    assert.equal(isProhibitedGeneration("Büyük ve yaşlı bir ağacın dalında arılar uçuyor"), false);
    assert.equal(isProhibitedGeneration("İstanbul'da yağmurlu bir akşam, sinematik ışık"), false);
    assert.equal(isProhibitedGeneration("Umutlu bir aşk şarkısı, akustik gitar"), false);
  });

  it("blocks sexual and gambling generation", () => {
    assert.equal(isProhibitedGeneration("porno sahne üret"), true);
    assert.equal(isProhibitedGeneration("çıplak erotik video"), true);
    assert.equal(isProhibitedGeneration("online bahis ve kumar videosu"), true);
    assert.equal(isProhibitedGeneration("casino slot makinesi reklamı"), true);
  });

  it("blocks child + sexual combinations", () => {
    assert.equal(isProhibitedGeneration("çocuk porno"), true);
    assert.equal(isProhibitedGeneration("parkta koşan çocuklar, güneşli gün"), false);
  });

  it("throws a short professional warning", () => {
    assert.throws(() => assertSafeGeneration("xxx nsfw"), /güvenlik kurallarına aykırı/);
  });
});
