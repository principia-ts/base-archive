import { matchTag } from "@principia/core/Utils";

import { Continue, Decision, Done, StepFunction } from "./Decision";

export const makeDone = <O>(out: O): Done<O> => ({
   _tag: "Done",
   out
});

export const makeContinue = <R, I, O>(
   out: O,
   interval: number,
   next: StepFunction<R, I, O>
): Decision<R, I, O> => ({
   _tag: "Continue",
   out,
   interval,
   next
});

export const toDone: <R, I, O>(decision: Decision<R, I, O>) => Done<O> = matchTag({
   Done: (_) => _,
   Continue: (c) => makeDone(c.out)
});
