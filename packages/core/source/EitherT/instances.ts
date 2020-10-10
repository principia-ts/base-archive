import type * as TC from "@principia/prelude";
import { getApplicativeComposition, getCovariantFunctorComposition, pureF } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Either } from "../Either";
import * as E from "../Either";
import { pipe } from "../Function";

export type V<C> = HKT.CleanParam<C, "E"> & HKT.V<"E", "+">;

export function Applicative<F extends HKT.URIS, C = HKT.Auto>(
   F: TC.Applicative<F, C>
): TC.Applicative<HKT.AppendURI<F, E.URI>, V<C>>;
export function Applicative<F>(
   F: TC.Applicative<HKT.UHKT<F>>
): TC.Applicative<HKT.AppendURI<HKT.UHKT<F>, E.URI>, HKT.V<"E", "+">> {
   return HKT.instance<TC.Applicative<HKT.AppendURI<HKT.UHKT<F>, E.URI>, HKT.V<"E", "+">>>({
      ...getApplicativeComposition(F, E.Applicative)
   });
}

export function Monad<F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>): TC.Monad<HKT.AppendURI<F, E.URI>, V<C>>;
export function Monad<F>(M: TC.Monad<HKT.UHKT<F>>): TC.Monad<HKT.AppendURI<HKT.UHKT<F>, E.URI>, HKT.V<"E", "+">> {
   const pure = pureF(M);
   return HKT.instance<TC.Monad<HKT.AppendURI<HKT.UHKT<F>, E.URI>, HKT.V<"E", "+">>>({
      ...getCovariantFunctorComposition(M, E.Functor),
      flatten: <E, A, D>(mma: HKT.HKT<F, Either<E, HKT.HKT<F, Either<D, A>>>>) =>
         pipe(mma, M.map(E.fold((e) => pure(E.widenE<D>()(E.left(e))), M.map(E.widenE<E>()))), M.flatten),
      unit: () => pure(E.unit())
   });
}
