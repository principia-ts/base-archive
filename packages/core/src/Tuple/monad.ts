import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { fst, snd } from "./destructors";
import { Functor } from "./functor";
import type { URI, V } from "./model";
import { unit } from "./unit";

export function getMonad<M>(M: Monoid<M>): P.Monad<[URI], V & HKT.Fix<"I", M>> {
  const flatten: P.FlattenFn<[URI], V & HKT.Fix<"I", M>> = (mma) =>
    [fst(fst(mma)), M.combine_(snd(fst(mma)), snd(mma))] as const;

  return HKT.instance<P.Monad<[URI], V & HKT.Fix<"I", M>>>({
    ...Functor,
    unit: unit(M),
    flatten
  });
}
