import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { both, left, right } from "./constructors";
import { Functor } from "./functor";
import { isLeft, isRight } from "./guards";
import type { These, URI } from "./model";

/*
 * -------------------------------------------
 * Apply These
 * -------------------------------------------
 */

export function getApply<E>(SE: P.Semigroup<E>): P.Apply<[URI], HKT.Fix<"E", E>> {
  const zipWith_: P.ZipWithFn_<[URI], HKT.Fix<"E", E>> = (fa, fb, f) =>
    isLeft(fa)
      ? isLeft(fb)
        ? left(SE.combine_(fa.left, fb.left))
        : isRight(fb)
        ? fa
        : left(SE.combine_(fa.left, fb.left))
      : isRight(fa)
      ? isLeft(fb)
        ? left(fb.left)
        : isRight(fb)
        ? right(f(fa.right, fb.right))
        : both(fb.left, f(fa.right, fb.right))
      : isLeft(fb)
      ? left(SE.combine_(fa.left, fb.left))
      : isRight(fb)
      ? both(fa.left, f(fa.right, fb.right))
      : both(SE.combine_(fa.left, fb.left), f(fa.right, fb.right));

  return HKT.instance({
    ...Functor,
    zipWith_,
    zipWith: <A, B, C>(fb: These<E, B>, f: (a: A, b: B) => C) => (fa: These<E, A>) =>
      zipWith_(fa, fb, f),
    ap_: (fab, fa) => zipWith_(fab, fa, (f, a) => f(a)),
    ap: <A>(fa: These<E, A>) => <B>(fab: These<E, (a: A) => B>) => zipWith_(fab, fa, (f, a) => f(a))
  });
}
