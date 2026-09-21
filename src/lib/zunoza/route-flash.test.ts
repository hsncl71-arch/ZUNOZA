import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pendingAppHref } from "./nav-flash.ts";

describe("pendingAppHref", () => {
  const origin = "https://zunoza.app";
  it("accepts internal studio links", () => {
    assert.equal(pendingAppHref("/gorsel", "/", origin), "/gorsel");
    assert.equal(pendingAppHref("/olustur", "/", origin), "/olustur");
  });
  it("skips same page, auth and external", () => {
    assert.equal(pendingAppHref("/gorsel", "/gorsel", origin), null);
    assert.equal(pendingAppHref("/auth/start?providerId=x", "/", origin), null);
    assert.equal(pendingAppHref("https://example.com/x", "/", origin), null);
  });
});
