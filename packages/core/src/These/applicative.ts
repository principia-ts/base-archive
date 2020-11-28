import type * as P from "@principia/prelude";
import { tuple } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { getApply } from "./apply";
import { Functor } from "./functor";
import type { These, URI } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative These
 * -------------------------------------------
 */

export function getApplicative<E>(SE: P.Semigroup<E>): P.Applicative<[URI], HKT.Fix<"E", E>> {
  const apply = getApply(SE);

  return HKT.instance({
    ...Functor,
    unit,
    both_: (fa, fb) => apply.mapBoth_(fa, fb, tuple),
    both: <B>(fb: These<E, B>) => <A>(fa: These<E, A>) => apply.mapBoth_(fa, fb, tuple)
  });
}
