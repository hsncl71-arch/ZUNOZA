import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPersonName,
  extractSavePayload,
  identityReply,
  isAbusiveOrTransient,
  isForgetCommand,
  isIdentityCorrection,
  isIdentityQuestion,
  isJunkStoredMemory,
  isNameLike,
  isSensitiveMemory,
  isSideTalk,
  looksLikeMemoryCommand,
  companyReply,
} from "./memory-intent.ts";

test("saves remember-this phrases into a name fact", () => {
  assert.match(extractSavePayload("Bunu hatırla: adım Hasan Öcal"), /Hasan Öcal/);
  assert.equal(extractPersonName("adım Hasan Öcal"), "Hasan Öcal");
  assert.equal(extractPersonName("Ben Hasan Öcal'ım"), "Hasan Öcal");
  assert.equal(extractPersonName("Ben Hasan Öcal’ım. Bunu kalıcı olarak hatırla."), "Hasan Öcal");
  assert.equal(extractPersonName("Ben Hasan Öcal'ım. Bunu hatırla."), "Hasan Öcal");
  assert.match(extractSavePayload("Adım Hasan Öcal, bunu hatırla"), /Hasan Öcal/);
  assert.match(extractSavePayload("bunu hatırla", "Benim adım Hasan Öcal"), /Hasan Öcal/);
  assert.match(extractSavePayload("beni Hasan Öcal olarak hatırla"), /Hasan Öcal/);
  assert.match(extractSavePayload("Ben Hasan Öcal'ım. Bunu kalıcı olarak hatırla."), /Hasan Öcal/);
  assert.equal(looksLikeMemoryCommand("Bunu hatırla adım Hasan Öcal"), true);
  assert.equal(looksLikeMemoryCommand("Benim adım Hasan Öcal"), true);
});

test("who-am-i uses stored name", () => {
  assert.equal(isIdentityQuestion("Ben kimim?"), true);
  assert.equal(looksLikeMemoryCommand("Ben kimim"), true);
  assert.equal(
    identityReply([{ id: "1", content: "Kullanıcının adı Hasan Öcal", createdAt: "2026-09-13" }]),
    "Hasan Öcal.",
  );
  assert.equal(
    identityReply([{ id: "1", content: "Kullanıcının adı Hasan Öcal’", createdAt: "2026-09-13" }]),
    "Hasan Öcal.",
  );
});

test("acknowledgements are never saved as a name", () => {
  assert.equal(extractSavePayload("Peki"), "");
  assert.equal(extractSavePayload("tamam"), "");
  assert.equal(extractSavePayload("Evet"), "");
  assert.equal(extractPersonName("Peki"), "");
  assert.equal(isNameLike("Peki"), false);
  assert.equal(looksLikeMemoryCommand("Peki"), false);
  assert.equal(looksLikeMemoryCommand("tamam"), false);
  assert.equal(isJunkStoredMemory("Kullanıcının adı Peki"), true);
  assert.equal(extractSavePayload("bunu hatırla", "Peki"), "");
  assert.match(extractSavePayload("Benim adım Hasan Öcal"), /Hasan Öcal/);
});

test("forget-from-your-memory is a real delete command", () => {
  assert.equal(isForgetCommand("Hafızandan sil"), true);
  assert.equal(isForgetCommand("hafızandan sil"), true);
  assert.equal(isForgetCommand("adımı unut"), true);
  assert.equal(isForgetCommand("adımı sil"), true);
  assert.equal(looksLikeMemoryCommand("Hafızandan sil"), true);
});

test("sensitive secrets are rejected as memories", () => {
  assert.equal(isSensitiveMemory("şifrem 123456"), true);
  assert.equal(isSensitiveMemory("kart no 4111111111111111"), true);
  assert.equal(isSensitiveMemory("tc kimlik 12345678901"), true);
  assert.equal(isSensitiveMemory("emailim ali@example.com"), true);
  assert.equal(isSensitiveMemory("Adım Hasan Öcal"), false);
});

test("company memory save and recall", () => {
  assert.match(extractSavePayload("Şirketimin adı Öz Öcal Tesbihçilik. Bunu hatırla."), /Öz Öcal Tesbihçilik/);
  assert.equal(
    companyReply([{ id: "1", content: "Kullanıcının şirketi Öz Öcal Tesbihçilik", createdAt: "2026-09-13" }]),
    "Öz Öcal Tesbihçilik",
  );
});

test("identity save is a memory command, not a founder shortcut", () => {
  assert.equal(looksLikeMemoryCommand("Ben Hasan Öcal'ım. Bunu kalıcı olarak hatırla."), true);
  assert.equal(looksLikeMemoryCommand("Ben kimim?"), true);
  assert.equal(looksLikeMemoryCommand("Şirketimin adı Öz Öcal Tesbihçilik. Bunu hatırla."), true);
});

test("insults and rants are not memory writes", () => {
  assert.equal(looksLikeMemoryCommand("Gerizekalı, ne Hasan Öcal'ı?"), false);
  assert.equal(extractPersonName("Gerizekalı, ne Hasan Öcal'ı?"), "");
  assert.equal(extractSavePayload("Gerizekalı, ne Hasan Öcal'ı?"), "");
  assert.equal(looksLikeMemoryCommand("Salak, yine yanlış yaptın."), false);
  assert.equal(extractSavePayload("Salak, yine yanlış yaptın."), "");
  assert.equal(isAbusiveOrTransient("Salak, yine yanlış yaptın."), true);
  assert.equal(looksLikeMemoryCommand("Ben geldim"), false);
  assert.equal(extractPersonName("Ben geldim"), "");
  assert.equal(isNameLike("gel"), false);
  assert.equal(isJunkStoredMemory("Kullanıcının adı Gerizekalı Hasan Öcal"), true);
  assert.equal(isJunkStoredMemory("Kullanıcının adı Hasan Öcal"), false);
});

test("side talk is not memory", () => {
  assert.equal(isSideTalk("Sen sus, sana demiyorum."), true);
  assert.equal(looksLikeMemoryCommand("Sen sus, sana demiyorum."), false);
  assert.equal(extractSavePayload("Sen sus, sana demiyorum."), "");
  assert.equal(isSideTalk("Sana demiyorum, yanımdakiyle konuşuyorum."), true);
  assert.equal(looksLikeMemoryCommand("Sana demiyorum, yanımdakiyle konuşuyorum."), false);
  assert.equal(extractSavePayload("Sana demiyorum, yanımdakiyle konuşuyorum."), "");
});

test("identity overwrite needs an explicit correction", () => {
  assert.equal(isIdentityCorrection("Gerizekalı, ne Hasan Öcal'ı?"), false);
  assert.equal(isIdentityCorrection("Benim adımı yanlış kaydetmişsin. Adım Ahmet Öcal. Bunu düzelt ve hatırla."), true);
  assert.match(extractSavePayload("Benim adımı yanlış kaydetmişsin. Adım Ahmet Öcal. Bunu düzelt ve hatırla."), /Ahmet Öcal/);
  assert.equal(
    identityReply([
      { id: "1", content: "Kullanıcının adı Gerizekalı Hasan Öcal", createdAt: "2026-09-13" },
      { id: "2", content: "Kullanıcının adı Hasan Öcal", createdAt: "2026-09-13" },
    ]),
    "Hasan Öcal.",
  );
  assert.equal(
    identityReply([{ id: "1", content: "Kullanıcının adı Hasan Öcal’", createdAt: "2026-09-13" }]),
    "Hasan Öcal.",
  );
});
