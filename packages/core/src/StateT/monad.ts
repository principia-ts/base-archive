import type * as P from "@principia/prelude";
import { chainF_ } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { getFunctor } from "./functor";
import type { StateT, V } from "./model";

export function getMonad<F extends HKT.URIS, C>(M: P.Monad<F, C>): P.Monad<StateT<F>, V<C>>;
export function getMonad<F>(M: P.Monad<HKT.UHKT<F>>): P.Monad<StateT<HKT.UHKT<F>>, V<HKT.Auto>> {
  const chainM_ = chainF_(M);
  const unit: P.UnitFn<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = () => (s) =>
    M.map_(M.unit(), (_) => [_, s]);
  const flatten: P.FlattenFn<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = (mma) => (s) =>
    chainM_(mma(s), ([f, s2]) => f(s2));

  return HKT.instance({
    ...getFunctor(M),
    flatten,
    unit
  });
}
