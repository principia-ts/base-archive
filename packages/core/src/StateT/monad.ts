import type * as P from "@principia/prelude";
import { chainF_ } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { StateT, V } from "./model";

export function Monad<F extends HKT.URIS, C>(M: P.Monad<F, C>): P.Monad<StateT<F>, V<C>>;
export function Monad<F>(M: P.Monad<HKT.UHKT<F>>): P.Monad<StateT<HKT.UHKT<F>>, V<HKT.Auto>> {
  const chainM_ = chainF_(M);
  const map_: P.MapFn_<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = (fa, f) => (s) =>
    M.map_(fa(s), ([a, s]) => [f(a), s]);
  const unit: P.UnitFn<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = () => (s) =>
    M.map_(M.unit(), (_) => [_, s]);
  const flatten: P.FlattenFn<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = (mma) => (s) =>
    chainM_(mma(s), ([f, s2]) => f(s2));

  return HKT.instance({
    map_,
    map: <A, B>(f: (a: A) => B) => <S>(fa: (s: S) => HKT.HKT<F, readonly [A, S]>) => map_(fa, f),
    flatten,
    unit
  });
}
