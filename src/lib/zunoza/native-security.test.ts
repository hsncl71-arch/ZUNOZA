import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nativeAuthHasEmbeddedSecret } from "./native-auth.ts";

const SECRET_FILES = [
  "capacitor.config.ts",
  "android/app/src/main/assets/capacitor.config.json",
  "android/app/src/main/java/app/zunoza/mobile/MainActivity.java",
  "ios/App/App/Info.plist",
  "native/www/index.html",
];

test("native bundle files do not embed provider or payment secrets", () => {
  for (const file of SECRET_FILES) {
    const text = readFileSync(file, "utf8");
    assert.equal(nativeAuthHasEmbeddedSecret(text), false, file);
    assert.doesNotMatch(text, /DATABASE_URL\s*=/);
    assert.doesNotMatch(text, /R2_SECRET_ACCESS_KEY/);
    assert.doesNotMatch(text, /SHOTSTACK_API_KEY/);
    assert.doesNotMatch(text, /ELEVENLABS_API_KEY/);
  }
});

test("native transport is HTTPS-only and downloads stay on known hosts", () => {
  const cap = readFileSync("capacitor.config.ts", "utf8");
  const net = readFileSync("android/app/src/main/res/xml/network_security_config.xml", "utf8");
  const java = readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8");
  const plist = readFileSync("ios/App/App/Info.plist", "utf8");
  assert.match(cap, /cleartext:\s*false/);
  assert.match(cap, /allowMixedContent:\s*false/);
  assert.match(net, /cleartextTrafficPermitted="false"/);
  assert.match(java, /startsWith\("https:\/\/"\)/);
  assert.match(java, /endsWith\("\.grok\.me"\)/);
  assert.match(plist, /NSAllowsArbitraryLoads/);
  assert.match(plist, /<false\/>/);
});
