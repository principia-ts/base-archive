import * as T from "../../Effect/core";
import { makeContinue, makeDone } from "./constructors";
import type { Decision } from "./Decision";

export const map_ = <R, I, A, B>(fa: Decision<R, I, A>, f: (a: A) => B): Decision<R, I, B> => {
   switch (fa._tag) {
      case "Done":
         return makeDone(f(fa.out));
      case "Continue":
         return makeContinue(f(fa.out), fa.interval, (n, i) => T.map_(fa.next(n, i), (a) => map_(a, f)));
   }
};

export const map = <A, B>(f: (a: A) => B) => <R, I>(fa: Decision<R, I, A>): Decision<R, I, B> => map_(fa, f);
