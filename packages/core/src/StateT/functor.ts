import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { StateT, V } from "./model";

export function getFunctor<F extends HKT.URIS, C>(F: P.Functor<F, C>): P.Apply<StateT<F>, V<C>>;
export function getFunctor<F>(
  F: P.Functor<HKT.UHKT<F>>
): P.Functor<StateT<HKT.UHKT<F>>, V<HKT.Auto>> {
  const map_: P.MapFn_<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = (fa, f) => (s) =>
    F.map_(fa(s), ([a, s]) => [f(a), s]);
  return HKT.instance({
    map_,
    map: <A, B>(f: (a: A) => B) => <S>(fa: (s: S) => HKT.HKT<F, readonly [A, S]>) => map_(fa, f)
  });
}
