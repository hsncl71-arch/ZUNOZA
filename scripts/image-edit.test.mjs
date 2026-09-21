import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const images = readFileSync(new URL("../src/lib/zunoza/images.ts", import.meta.url), "utf8");
const request = readFileSync(new URL("../src/lib/zunoza/image-request.ts", import.meta.url), "utf8");
const helper = readFileSync(new URL("../src/lib/zunoza/image-edit.ts", import.meta.url), "utf8");
const asistan = readFileSync(new URL("../src/routes/asistan.tsx", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/lib/zunoza/assistant.ts", import.meta.url), "utf8");
const gorsel = readFileSync(new URL("../src/routes/gorsel.tsx", import.meta.url), "utf8");

test("image edit uses xAI edits endpoint with existing image model", () => {
  assert.match(images, /export const editStudioImage/);
  assert.match(images, /https:\/\/api\.x\.ai\/v1\/images\/edits/);
  assert.match(request, /grok-imagine-image/);
});

test("friday message / background edit is treated as a real edit", () => {
  assert.match(helper, /arka plan|cuma/);
  assert.match(asistan, /editStudioImage/);
  assert.match(gorsel, /editStudioImage/);
  assert.match(assistant, /yapamıyorum” deme/);
});
