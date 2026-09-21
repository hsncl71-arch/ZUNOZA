import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isRealEmail, maskEmail } from "./privacy-mask.ts";
import {
  assertSafeIyzicoPayload,
  buildIyzicoBuyer,
  containsForbiddenIdentity,
} from "./iyzico-buyer.ts";
import { isOwnerEmail } from "./owner-email.ts";

describe("privacy-mask", () => {
  it("masks emails", () => {
    assert.equal(maskEmail("zunozaofficial@gmail.com"), "zu***@gmail.com");
    assert.equal(maskEmail(""), "—");
  });
  it("rejects synthetic emails", () => {
    assert.equal(isRealEmail("user-abc@zunoza.app"), false);
    assert.equal(isRealEmail("hasan@example.com"), true);
  });
  it("admin audit log returns masked emails", () => {
    const src = readFileSync(new URL("./admin.ts", import.meta.url), "utf8");
    assert.match(src, /adminEmail: maskEmail\(r\.email\)/);
    const musicStatus = readFileSync(new URL("../../routes/api/muzik-durum.ts", import.meta.url), "utf8");
    assert.doesNotMatch(musicStatus, /missingSecrets/);
    const musicUi = readFileSync(new URL("../../routes/muzik.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(musicUi, /ELEVENLABS_API_KEY/);
    assert.doesNotMatch(musicUi, /R2_ACCESS_KEY_ID/);
    const assistant = readFileSync(new URL("./assistant.ts", import.meta.url), "utf8");
    assert.match(assistant, /throw new Error\(publicAiError\(last\)\)/);
  });
});

describe("iyzico-buyer", () => {
  it("does not send fake identity fields", () => {
    const buyer = buildIyzicoBuyer({
      buyerId: "u1",
      buyerName: "Hasan",
      buyerSurname: "Ocal",
      email: "owner@example.com",
      ip: "1.2.3.4",
    });
    assert.equal("identityNumber" in buyer, false);
    assert.equal("gsmNumber" in buyer, false);
    assert.equal(containsForbiddenIdentity(buyer), false);
    assert.equal(buyer.email, "owner@example.com");
  });
  it("rejects fake checkout emails", () => {
    assert.throws(() =>
      buildIyzicoBuyer({
        buyerId: "u1",
        buyerName: "A",
        buyerSurname: "B",
        email: "user-abc@zunoza.app",
        ip: "1.1.1.1",
      }),
    );
  });
  it("rejects dummy localhost ip", () => {
    assert.throws(() =>
      buildIyzicoBuyer({
        buyerId: "u1",
        buyerName: "Hasan",
        buyerSurname: "Ocal",
        email: "owner@example.com",
        ip: "127.0.0.1",
      }),
    );
  });
  it("blocks TCKN and GSM keys even if later added", () => {
    assert.throws(() =>
      assertSafeIyzicoPayload({
        buyer: { identityNumber: "22222222222", email: "a@b.com" },
      }),
    );
    assert.throws(() =>
      assertSafeIyzicoPayload({
        buyer: { gsmNumber: "+905551112233" },
      }),
    );
    assert.throws(() => assertSafeIyzicoPayload({ identityNumber: "11111111111" }));
  });
});

describe("owner-email", () => {
  it("only the canonical owner email is owner by default", () => {
    assert.equal(isOwnerEmail("zunozaofficial@gmail.com"), true);
    assert.equal(isOwnerEmail("admin@example.com"), false);
    const owner = readFileSync(new URL("./owner.ts", import.meta.url), "utf8");
    assert.match(owner, /export async function isUnlimitedUser/);
    assert.doesNotMatch(owner, /emailVerified === false/);
    assert.equal(isOwnerEmail(""), false);
    assert.equal(isOwnerEmail(null), false);
  });
});
