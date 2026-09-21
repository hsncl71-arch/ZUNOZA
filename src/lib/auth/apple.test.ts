import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  APPLE_CALLBACK_PATH,
  APPLE_PROVIDER_ID,
  appleClientId,
  appleGenericOAuthConfig,
  createAppleClientSecret,
  isAppleAuthConfigured,
  normalizeApplePrivateKey,
} from "./apple.ts";

test("Apple callback matches the registered grok-apple return path", () => {
  assert.equal(APPLE_PROVIDER_ID, "grok-apple");
  assert.equal(APPLE_CALLBACK_PATH, "/api/auth/oauth2/callback/grok-apple");
});

test("Apple is off until Service ID plus key material exist", () => {
  assert.equal(isAppleAuthConfigured({}), false);
  assert.equal(isAppleAuthConfigured({ APPLE_CLIENT_ID: "com.zunoza.app.web" }), false);
  assert.equal(
    isAppleAuthConfigured({ APPLE_CLIENT_ID: "com.zunoza.app.web", APPLE_CLIENT_SECRET: "jwt" }),
    true,
  );
  assert.equal(
    isAppleAuthConfigured({
      APPLE_SERVICE_ID: "com.zunoza.app.web",
      APPLE_TEAM_ID: "TEAMID1234",
      APPLE_KEY_ID: "KEYID12345",
      APPLE_PRIVATE_KEY: "abc",
    }),
    true,
  );
});

test("Apple client id prefers APPLE_CLIENT_ID then APPLE_SERVICE_ID", () => {
  assert.equal(appleClientId({ APPLE_SERVICE_ID: "svc" }), "svc");
  assert.equal(appleClientId({ APPLE_CLIENT_ID: "cid", APPLE_SERVICE_ID: "svc" }), "cid");
});

test("Apple client secret JWT is ES256 and tied to the Service ID", () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const token = createAppleClientSecret({
    clientId: "com.zunoza.app.web",
    teamId: "TEAMID1234",
    keyId: "KEYID12345",
    privateKey: pem,
    now: 1_700_000_000,
  });
  const [header, payload] = token.split(".").slice(0, 2).map((part) => JSON.parse(Buffer.from(part, "base64url").toString()));
  assert.equal(header.alg, "ES256");
  assert.equal(header.kid, "KEYID12345");
  assert.equal(payload.iss, "TEAMID1234");
  assert.equal(payload.sub, "com.zunoza.app.web");
  assert.equal(payload.aud, "https://appleid.apple.com");
  assert.equal(normalizeApplePrivateKey("abcd").includes("BEGIN PRIVATE KEY"), true);
  assert.ok(appleGenericOAuthConfig({ APPLE_CLIENT_ID: "com.zunoza.app.web", APPLE_CLIENT_SECRET: "jwt" }));
  assert.equal(appleGenericOAuthConfig({}), null);
});
