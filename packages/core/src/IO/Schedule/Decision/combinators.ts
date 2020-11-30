import * as I from "../../_core";
import { makeContinue, makeDone } from "./constructors";
import type { Decision, StepFunction } from "./Decision";
import { map_ } from "./methods";

export function contramapIn_<R, I, I1, O>(
  fa: Decision<R, I, O>,
  f: (i: I1) => I
): Decision<R, I1, O> {
  switch (fa._tag) {
    case "Done":
      return fa;
    case "Continue":
      return makeContinue(fa.out, fa.interval, (n, i) =>
        I.map_(fa.next(n, f(i)), (a) => contramapIn_(a, f))
      );
  }
}

export function contramapIn<I, I1>(
  f: (i: I1) => I
): <R, O>(fa: Decision<R, I, O>) => Decision<R, I1, O> {
  return (fa) => contramapIn_(fa, f);
}

export function as_<R, I, O, O1>(fa: Decision<R, I, O>, o: O1): Decision<R, I, O1> {
  return map_(fa, () => o);
}

export function as<O1>(o: O1): <R, I, O>(fa: Decision<R, I, O>) => Decision<R, I, O1> {
  return (fa) => as_(fa, o);
}

export function done<A>(a: A): StepFunction<unknown, unknown, A> {
  return () => I.pure(makeDone(a));
}
