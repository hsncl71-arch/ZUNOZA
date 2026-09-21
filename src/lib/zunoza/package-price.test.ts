import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { payablePackageTry, payableTryAmount } from "./package-price.ts";
import {
  paidAmountMatches,
  settlementAllowsCredit,
  isIyzicoRefundEvent,
  classifySettlement,
  publicIyzicoError,
  trailingZeroAmount,
  retrieveSignatureSource,
  webhookSignatureAccepted,
} from "./iyzico.server.ts";

describe("payablePackageTry", () => {
  it("uses the admin price without a client-supplied amount", () => {
    assert.equal(payablePackageTry(249, 0), 249);
    assert.equal(payablePackageTry(399, 10), 359);
    assert.equal(payablePackageTry(0, 0), null);
    assert.equal(payablePackageTry(null, 0), null);
    assert.equal(payablePackageTry(-10, 0), null);
  });
  it("caps discount and never pays zero", () => {
    assert.equal(payablePackageTry(100, 200), 10);
    assert.equal(payablePackageTry(1, 90), null);
  });
});

describe("payableTryAmount", () => {
  it("keeps premium kuruş instead of rounding to integer TRY", () => {
    assert.equal(payableTryAmount(499.99), 499.99);
    assert.equal(payableTryAmount(1499.99), 1499.99);
    assert.equal(payableTryAmount("6999.99"), 6999.99);
    assert.equal(payableTryAmount(0), null);
    assert.equal(payableTryAmount(null), null);
  });
  it("does not change credit-pack whole-lira rounding", () => {
    assert.equal(payablePackageTry(499.99, 0), 500);
    assert.equal(payablePackageTry(299, 0), 299);
  });
});

describe("iyzico settlement guards", () => {
  it("credits only SUCCESS with matching paid amount", () => {
    assert.equal(
      settlementAllowsCredit({ paymentStatus: "SUCCESS", status: "success", paidPrice: 249 }, 249),
      true,
    );
    assert.equal(
      settlementAllowsCredit({ paymentStatus: "FAILURE", status: "success", paidPrice: 249 }, 249),
      false,
    );
    assert.equal(
      settlementAllowsCredit({ paymentStatus: "SUCCESS", status: "success", paidPrice: 1 }, 249),
      false,
    );
    assert.equal(settlementAllowsCredit({ paymentStatus: "SUCCESS", paidPrice: "249.00" }, 249), true);
    assert.equal(paidAmountMatches("200", 249), false);
  });
  it("accepts premium 499.99 without integer conversion", () => {
    assert.equal(paidAmountMatches(499.99, 499.99), true);
    assert.equal(paidAmountMatches("499.99", 499.99), true);
    assert.equal(
      settlementAllowsCredit({ paymentStatus: "SUCCESS", status: "success", paidPrice: 499.99 }, 499.99),
      true,
    );
  });
  it("treats pending as not-success and not-failure", () => {
    assert.equal(classifySettlement({ paymentStatus: "INIT_THREEDS", status: "success", paidPrice: 249 }, 249), "pending");
    assert.equal(classifySettlement({ status: "success", paidPrice: 249 }, 249), "pending");
    assert.equal(classifySettlement({ paymentStatus: "FAILURE", paidPrice: 249 }, 249), "failure");
    assert.equal(settlementAllowsCredit({ paymentStatus: "INIT_THREEDS", paidPrice: 249 }, 249), false);
    assert.equal(
      classifySettlement({ paymentStatus: "SUCCESS", status: "success", paidPrice: 249, fraudStatus: 0 }, 249),
      "pending",
    );
    assert.equal(
      classifySettlement({ paymentStatus: "SUCCESS", status: "success", paidPrice: 249, fraudStatus: -1 }, 249),
      "failure",
    );
    assert.equal(
      classifySettlement({ paymentStatus: "SUCCESS", status: "success", paidPrice: 249, currency: "USD" }, 249),
      "failure",
    );
    assert.equal(
      classifySettlement({ paymentStatus: "SUCCESS", status: "success", paidPrice: 249, currency: "TRY", fraudStatus: 1 }, 249),
      "success",
    );
    assert.equal(
      classifySettlement(
        { paymentStatus: "SUCCESS", status: "success", paidPrice: 99, currency: "TRY", signature: "deadbeef" },
        99,
      ),
      "success",
    );
  });
  it("redacts secret-looking iyzico errors and rejects unsigned webhooks", () => {
    assert.equal(publicIyzicoError("apiKey leaked"), "Ödeme başlatılamadı.");
    assert.equal(publicIyzicoError(""), "Ödeme başlatılamadı.");
    assert.equal(webhookSignatureAccepted(null, { token: "x" }), false);
    assert.equal(webhookSignatureAccepted("abc", { token: "x" }), false);
    assert.equal(trailingZeroAmount("10.50"), "10.5");
    assert.match(
      retrieveSignatureSource({
        paymentStatus: "SUCCESS",
        paymentId: "1",
        currency: "TRY",
        basketId: "p1",
        conversationId: "c1",
        paidPrice: "10.50",
        price: "10.50",
        token: "t1",
      }),
      /SUCCESS1TRYp1c110\.510\.5t1/,
    );
  });
});

describe("credit package checkout wiring", () => {
  it("paketler starts iyzico instead of a stub", () => {
    const src = readFileSync(new URL("../../routes/paketler.tsx", import.meta.url), "utf8");
    assert.match(src, /startPackagePayment/);
    assert.match(src, /getPaymentStatus/);
    assert.match(src, /beklemede
... 