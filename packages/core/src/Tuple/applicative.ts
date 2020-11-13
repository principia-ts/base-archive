import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { fst, snd } from "./destructors";
import { Functor } from "./functor";
import type { Tuple, URI, V } from "./model";
import { unit } from "./unit";

export function getApplicative<M>(M: Monoid<M>): P.Applicative<[URI], V & HKT.Fix<"I", M>> {
   const both_: P.BothFn_<[URI], V & HKT.Fix<"I", M>> = (fa, fb) => [[fst(fa), fst(fb)], M.combine_(snd(fa), snd(fb))];
   return HKT.instance<P.Applicative<[URI], V & HKT.Fix<"I", M>>>({
      ...Functor,
      both_,
      both: (fb) => (fa) => both_(fa, fb),
      unit: unit(M)
   });
}

export function pure<M>(M: Monoid<M>): <A>(a: A) => Tuple<A, M> {
   return (a) => [a, M.nat] as const;
}
