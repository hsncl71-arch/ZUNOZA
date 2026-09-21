import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const cap = readFileSync(new URL("./cost-cap.ts", import.meta.url), "utf8");
const credits = readFileSync(new URL("./credits.ts", import.meta.url), "utf8");
const usage = readFileSync(new URL("./ai-usage.ts", import.meta.url), "utf8");

test("owner/admin skip credit debit but not the global API spend cap", () => {
  const fn = cap.slice(cap.indexOf("export async function assertSpendCap"), cap.length);
  assert.doesNotMatch(fn, /isUnlimitedUser\(sql, ctx\.userId\)\) return;/);
  assert.match(fn, /spendWouldBlock/);
  assert.match(credits, /charged: 0, unlimited: true/);
  assert.match(usage, /isUnlimitedUser\(sql, userId\)\) return;/);
  assert.match(usage, /logAiUsage/);
  assert.match(usage, /costSource/);
});
