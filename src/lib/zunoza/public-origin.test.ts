import assert from "node:assert/strict";
import test from "node:test";
import { publicAppOrigin } from "./public-origin.ts";

function withEnv<T>(fn: () => T) {
  const a = process.env.BETTER_AUTH_URL;
  const b = process.env.APP_URL;
  delete process.env.BETTER_AUTH_URL;
  delete process.env.APP_URL;
  try {
    return fn();
  } finally {
    if (a === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = a;
    if (b === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = b;
  }
}

test("production hosts are forced to https", () => {
  withEnv(() => {
    const req = new Request("http://app.grok.me/paketler", {
      headers: { host: "app.grok.me", "x-forwarded-proto": "http" },
    });
    assert.equal(publicAppOrigin(req), "https://app.grok.me");
  });
});

test("localhost stays http for preview", () => {
  withEnv(() => {
    const req = new Request("http://127.0.0.1:8080/", {
      headers: { host: "127.0.0.1:8080" },
    });
    assert.equal(publicAppOrigin(req), "http://127.0.0.1:8080");
  });
});

test("env http production url is upgraded", () => {
  withEnv(() => {
    process.env.BETTER_AUTH_URL = "http://app.zunoza.com";
    assert.equal(publicAppOrigin(undefined), "https://app.zunoza.com");
  });
});

test("untrusted forwarded host is rejected", () => {
  withEnv(() => {
    const req = new Request("http://evil.example/", {
      headers: { host: "evil.example", "x-forwarded-host": "evil.example" },
    });
    assert.equal(publicAppOrigin(req), "");
  });
});

test("zunoza custom domains are trusted https origins", () => {
  withEnv(() => {
    const apex = new Request("http://zunoza.com/", {
      headers: { host: "zunoza.com", "x-forwarded-proto": "http" },
    });
    assert.equal(publicAppOrigin(apex), "https://zunoza.com");
    const www = new Request("http://www.zunoza.com/", {
      headers: { host: "www.zunoza.com" },
    });
    assert.equal(publicAppOrigin(www), "https://www.zunoza.com");
  });
});
