import assert from "node:assert/strict";
import test from "node:test";
import { applyUserScrollIntent, isFlowAtBottom, shouldAutoFollowFlow } from "./builder-scroll.ts";

test("manual upward scroll locks follow even if still near the bottom", () => {
  assert.equal(isFlowAtBottom(920, 1000, 80, 64), true);
  const up = applyUserScrollIntent({ deltaY: -40, atBottom: true, programmatic: false });
  assert.equal(up.stick, false);
  assert.equal(up.away, true);
});

test("new events never follow while the user is reading history", () => {
  assert.equal(
    shouldAutoFollowFlow({ stick: false, userScrolling: false, programmatic: false, contentGrew: true }),
    false,
  );
  assert.equal(
    shouldAutoFollowFlow({ stick: true, userScrolling: true, programmatic: false, contentGrew: true }),
    false,
  );
  assert.equal(
    shouldAutoFollowFlow({ stick: true, userScrolling: false, programmatic: true, contentGrew: true }),
    false,
  );
  assert.equal(
    shouldAutoFollowFlow({ stick: true, userScrolling: false, programmatic: false, contentGrew: false }),
    false,
  );
});

test("only a real content grow while stuck to bottom may follow", () => {
  assert.equal(
    shouldAutoFollowFlow({ stick: true, userScrolling: false, programmatic: false, contentGrew: true }),
    true,
  );
  const down = applyUserScrollIntent({ deltaY: 30, atBottom: true, programmatic: false });
  assert.equal(down.stick, true);
  assert.equal(down.away, false);
});
