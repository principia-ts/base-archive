import * as T from "../../Task/core";
import { makeContinue, makeDone } from "./constructors";
import type { Decision, StepFunction } from "./Decision";
import { map_ } from "./methods";

export const contramapIn_ = <R, I, I1, O>(fa: Decision<R, I, O>, f: (i: I1) => I): Decision<R, I1, O> => {
   switch (fa._tag) {
      case "Done":
         return fa;
      case "Continue":
         return makeContinue(fa.out, fa.interval, (n, i) => T.map_(fa.next(n, f(i)), (a) => contramapIn_(a, f)));
   }
};

export const contramapIn = <I, I1>(f: (i: I1) => I) => <R, O>(fa: Decision<R, I, O>): Decision<R, I1, O> =>
   contramapIn_(fa, f);

export const as_ = <R, I, O, O1>(fa: Decision<R, I, O>, o: O1): Decision<R, I, O1> => map_(fa, () => o);

export const as = <O1>(o: O1) => <R, I, O>(fa: Decision<R, I, O>): Decision<R, I, O1> => as_(fa, o);

export const done = <A>(a: A): StepFunction<unknown, unknown, A> => () => T.pure(makeDone(a));
