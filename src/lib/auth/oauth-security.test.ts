import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const server = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
const apple = readFileSync(new URL("./apple.ts", import.meta.url), "utf8");

test("Apple form_post only sets OAuth state cookies to SameSite=None", () => {
  assert.match(server, /defaultCookieAttributes: \{ secure: true, sameSite: "lax", path: "\/" \}/);
  assert.match(server, /oauth_state: \{[\s\S]*sameSite: "none"[\s\S]*state: \{[\s\S]*sameSite: "none"/);
  assert.match(server, /session_token: \{ name: SESSION_TOKEN_COOKIE \}/);
  assert.doesNotMatch(server, /defaultCookieAttributes: \{[^}]*sameSite: "none"/);
  assert.match(apple, /responseMode: "form_post"/);
});

test("unverified email/password accounts cannot absorb Google or Apple logins", () => {
  assert.match(server, /requireLocalEmailVerified: true/);
  assert.match(server, /encryptOAuthTokens: true/);
  assert.match(server, /trustedProviders:/);
});
