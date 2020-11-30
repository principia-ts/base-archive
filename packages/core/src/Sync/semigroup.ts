import type { Semigroup } from "@principia/prelude";
import { fromCombine } from "@principia/prelude";

import { liftA2_ } from "./apply";
import { foldTogetherM_ } from "./combinators";
import { fail, succeed } from "./constructors";
import type { FSync, USync } from "./model";

/*
 * -------------------------------------------
 * Semigroup Sync
 * -------------------------------------------
 */

export function getUnfailableSemigroup<S>(S: Semigroup<S>): Semigroup<USync<S>> {
  return fromCombine(liftA2_(S.combine_));
}

export function getFailableSemigroup<E, A>(
  SA: Semigroup<A>,
  SE: Semigroup<E>
): Semigroup<FSync<E, A>> {
  return fromCombine((x, y) =>
    foldTogetherM_(
      x,
      y,
      (e, e1) => fail(SE.combine_(e, e1)),
      (_, e1) => fail(e1),
      (_, e) => fail(e),
      (a, b) => succeed(SA.combine_(a, b))
    )
  );
}
