import { matchTag_ } from "../../../Utils";
import type { Decision, Done, StepFunction } from "./Decision";

export function makeDone<O>(out: O): Done<O> {
  return {
    _tag: "Done",
    out
  };
}

export function makeContinue<R, I, O>(
  out: O,
  interval: number,
  next: StepFunction<R, I, O>
): Decision<R, I, O> {
  return {
    _tag: "Continue",
    out,
    interval,
    next
  };
}

export function toDone<R, I, O>(decision: Decision<R, I, O>): Done<O> {
  return matchTag_(decision, {
    Done: (_) => _,
    Continue: (c) => makeDone(c.out)
  });
}
