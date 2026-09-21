import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND,
  DEFAULT_FOUNDER_PROFILE,
  brandInstantReply,
  founderProfileSystem,
  isFounderQuestion,
} from "./brand.ts";
import { wantsWebSearch } from "./web-search-intent.ts";

test("founder questions return the full verified profile, not a one-liner", () => {
  const who = brandInstantReply("Seni kim kurdu?");
  assert.ok(who && who.includes(DEFAULT_FOUNDER_PROFILE.name));
  assert.ok(who.includes("ZUNOZA Teknoloji"));
  assert.ok(who.split(".").length > 3);
  assert.notEqual(who, `${BRAND.founderName}.`);
  assert.equal(isFounderQuestion("ZUNOZA'nın kurucusu kim?"), true);
  assert.equal(isFounderQuestion("seni kim üretti"), true);
});

test("who is Hasan Öcal uses the verified public bio", () => {
  const bio = brandInstantReply("Hasan Öcal kimdir?");
  assert.equal(bio, DEFAULT_FOUNDER_PROFILE.bio);
  assert.match(bio || "", /Öz Öcal Tespihçilik/);
  assert.match(bio || "", /yapay zeka/);
  const origin = brandInstantReply("Hasan Öcal nereli?");
  assert.ok(origin && origin.includes("Kırıkkale"));
  assert.notEqual(origin, "Kırıkkaleli.");
  assert.match(founderProfileSystem(), /tek cümlelik kısa yanıt VERME/);
});

test("brand knowledge is not a user-memory command", () => {
  assert.equal(brandInstantReply("Ben kimim?"), null);
  assert.equal(brandInstantReply("Ben Hasan Öcal'ım. Bunu hatırla."), null);
  assert.equal(brandInstantReply("Gerizekalı, ne Hasan Öcal'ı?"), null);
});

test("founder questions do not trigger web search", () => {
  assert.equal(wantsWebSearch("Hasan Öcal kimdir?"), false);
  assert.equal(wantsWebSearch("Seni kim kurdu?"), false);
  assert.equal(wantsWebSearch("iPhone 17 Pro Max fiyatı ne kadar?"), true);
});
