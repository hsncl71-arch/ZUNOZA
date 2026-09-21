export function isFlowAtBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  slack = 64,
) {
  return scrollHeight - scrollTop - clientHeight <= slack;
}

export function shouldAutoFollowFlow(input: {
  stick: boolean;
  userScrolling: boolean;
  programmatic: boolean;
  contentGrew: boolean;
}) {
  return input.stick && !input.userScrolling && !input.programmatic && input.contentGrew;
}

export function applyUserScrollIntent(input: {
  deltaY?: number;
  atBottom: boolean;
  programmatic: boolean;
}): { stick: boolean; away: boolean; ignore: boolean } {
  if (input.programmatic) return { stick: true, away: false, ignore: true };
  if (typeof input.deltaY === "number" && input.deltaY < 0) {
    return { stick: false, away: true, ignore: false };
  }
  return { stick: input.atBottom, away: !input.atBottom, ignore: false };
}
