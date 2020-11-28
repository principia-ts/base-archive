import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { fst, snd } from "./destructors";
import { Functor } from "./functor";
import type { URI, V } from "./model";

export function getApply<M>(M: Monoid<M>): P.Apply<[URI], V & HKT.Fix<"I", M>> {
  const zipWith_: P.ZipWithFn_<[URI], HKT.Fix<"I", M>> = (fa, fb, f) => [
    f(fst(fa), fst(fb)),
    M.combine_(snd(fa), snd(fb))
  ];
  const ap_: P.ApFn_<[URI], V & HKT.Fix<"I", M>> = (fab, fa) => [
    fst(fab)(fst(fa)),
    M.combine_(snd(fab), snd(fa))
  ];

  return HKT.instance<P.Apply<[URI], V & HKT.Fix<"I", M>>>({
    ...Functor,
    zipWith_,
    zipWith: (fb, f) => (fa) => zipWith_(fa, fb, f),
    ap_,
    ap: (fa) => (fab) => ap_(fab, fa)
  });
}
