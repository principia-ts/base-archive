import type * as TC from "@principia/prelude";
import {
   flow,
   getApplicativeComposition,
   getApplyComposition,
   getCovariantFunctorComposition,
   identity,
   pureF
} from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Either } from "../Either";
import * as E from "../Either";
import { pipe } from "../Function";

export type V<C> = HKT.CleanParam<C, "E"> & HKT.V<"E", "+">;

export function getApplicative<F extends HKT.URIS, C = HKT.Auto>(
   F: TC.Applicative<F, C>
): TC.Applicative<HKT.AppendURI<F, E.URI>, V<C>>;
export function getApplicative<F>(
   F: TC.Applicative<HKT.UHKT<F>>
): TC.Applicative<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V> {
   return HKT.instance<TC.Applicative<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V>>({
      ...getApplicativeComposition(F, E.Applicative)
   });
}

export function getApply<F extends HKT.URIS, C = HKT.Auto>(F: TC.Apply<F, C>): TC.Apply<HKT.AppendURI<F, E.URI>, V<C>>;
export function getApply<F>(F: TC.Apply<HKT.UHKT<F>>): TC.Apply<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V> {
   return HKT.instance<TC.Apply<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V>>({
      ...getApplyComposition(F, E.Apply)
   });
}

export function getMonad<F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>): TC.Monad<HKT.AppendURI<F, E.URI>, V<C>>;
export function getMonad<F>(M: TC.Monad<HKT.UHKT<F>>): TC.Monad<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V> {
   const pure = pureF(M);
   return HKT.instance<TC.Monad<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V>>({
      ...getCovariantFunctorComposition(M, E.Functor),
      flatten: <E, A, D>(mma: HKT.HKT<F, Either<E, HKT.HKT<F, Either<D, A>>>>) =>
         pipe(mma, M.map(E.fold((e) => pure(E.widenE<D>()(E.left(e))), M.map(E.widenE<E>()))), M.flatten),
      unit: () => pure(E.unit())
   });
}

export function getFallible<F extends HKT.URIS, C = HKT.Auto>(
   F: TC.Functor<F, C> & TC.Unit<F, C>
): TC.Fallible<HKT.AppendURI<F, E.URI>, V<C>>;
export function getFallible<F>(
   F: TC.Functor<HKT.UHKT<F>> & TC.Unit<HKT.UHKT<F>>
): TC.Fallible<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V> {
   const pure = pureF(F);
   return HKT.instance<TC.Fallible<HKT.AppendURI<HKT.UHKT<F>, E.URI>, E.V>>({
      absolve: (fa) => F.map_(fa, E.fold(E.left, identity)),
      recover: (fa) => F.map_(fa, E.fold(flow(E.left, E.right), flow(E.right, E.right))),
      fail: flow(E.left, pure)
   });
}
