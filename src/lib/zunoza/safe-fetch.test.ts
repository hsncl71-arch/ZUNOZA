import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedOutboundHost, isPrivateOrLocalHost, isSafeMediaSource, parseSafeHttpsUrl } from "./safe-fetch.ts";

test("blocks metadata and private SSRF targets", () => {
  assert.equal(isPrivateOrLocalHost("127.0.0.1"), true);
  assert.equal(isPrivateOrLocalHost("169.254.169.254"), true);
  assert.equal(isPrivateOrLocalHost("10.0.0.5"), true);
  assert.equal(isPrivateOrLocalHost("192.168.1.1"), true);
  assert.equal(isPrivateOrLocalHost("localhost"), true);
  assert.equal(parseSafeHttpsUrl("http://api.x.ai/v1"), null);
  assert.equal(parseSafeHttpsUrl("https://169.254.169.254/latest"), null);
  assert.equal(parseSafeHttpsUrl("https://evil.example/x"), null);
});

test("allows provider hosts over https", () => {
  assert.equal(isAllowedOutboundHost("api.x.ai"), true);
  assert.equal(Boolean(parseSafeHttpsUrl("https://api.x.ai/v1/videos/x")), true);
  assert.equal(isSafeMediaSource("data:image/jpeg;base64,aaa"), true);
  assert.equal(isSafeMediaSource("http://api.x.ai/img"), false);
});
