import type * as P from "@principia/prelude";
import {
   flow,
   getApplicativeComposition,
   getApplyComposition,
   getCovariantFunctorComposition,
   identity,
   pureF
} from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as O from "../Option";

export function getMonad<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): P.Monad<HKT.AppendURI<F, O.URI>, C>;
export function getMonad<F>(M: P.Monad<HKT.UHKT<F>>): P.Monad<HKT.AppendURI<HKT.UHKT<F>, O.URI>, HKT.Auto> {
   const pure = pureF(M);
   return HKT.instance<P.Monad<HKT.AppendURI<HKT.UHKT<F>, O.URI>, HKT.Auto>>({
      ...getCovariantFunctorComposition(M, O.Functor),
      flatten: flow(M.map(O.fold(() => pure(O.none()), identity)), M.flatten),
      unit: () => pure(O.some(undefined))
   });
}

export function getApplicative<F extends HKT.URIS, C = HKT.Auto>(
   F: P.Applicative<F, C>
): P.Applicative<HKT.AppendURI<F, O.URI>, C>;
export function getApplicative<F>(
   F: P.Applicative<HKT.UHKT<F>>
): P.Applicative<HKT.AppendURI<HKT.UHKT<F>, O.URI>, HKT.Auto> {
   return HKT.instance<P.Applicative<HKT.AppendURI<HKT.UHKT<F>, O.URI>, HKT.Auto>>({
      ...getApplicativeComposition(F, O.Applicative)
   });
}

export function getApply<F extends HKT.URIS, C = HKT.Auto>(F: P.Apply<F, C>): P.Apply<HKT.AppendURI<F, O.URI>, C>;
export function getApply<F>(F: P.Apply<HKT.UHKT<F>>): P.Apply<HKT.AppendURI<HKT.UHKT<F>, O.URI>, HKT.Auto> {
   return HKT.instance<P.Apply<HKT.AppendURI<HKT.UHKT<F>, O.URI>, HKT.Auto>>({
      ...getApplyComposition(F, O.Apply)
   });
}
