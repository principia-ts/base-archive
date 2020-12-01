import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { getFunctor } from "./functor";
import type { StateIn, StateOut, StateT, V } from "./model";

export function getApply<F extends HKT.URIS, C>(F: P.Monad<F, C>): P.Apply<StateT<F>, V<C>>;
export function getApply<F>(F: P.Monad<HKT.UHKT<F>>): P.Apply<StateT<HKT.UHKT<F>>, V<HKT.Auto>> {
  const chainM_ = P.chainF_(F);
  const zipWith_: P.ZipWithFn_<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = <S, A, B, C>(
    fa: StateIn<S, HKT.HKT<F, StateOut<S, A>>>,
    fb: StateIn<S, HKT.HKT<F, StateOut<S, B>>>,
    f: (a: A, b: B) => C
  ) => (s: S) => chainM_(fa(s), ([a, s1]) => F.map_(fb(s1), ([b, s2]) => [f(a, b), s2]));
  const ap_: P.ApFn_<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = (fab, fa) =>
    zipWith_(fab, fa, (f, a) => f(a));

  return HKT.instance({
    ...getFunctor(F),
    zipWith_,
    zipWith: <S, A, B, C>(fb: (s: S) => HKT.HKT<F, readonly [B, S]>, f: (a: A, b: B) => C) => (
      fa: (s: S) => HKT.HKT<F, readonly [A, S]>
    ) => zipWith_(fa, fb, f),
    ap_,
    ap: <S, A>(fa: (s: S) => HKT.HKT<F, readonly [A, S]>) => <B>(
      fab: (s: S) => HKT.HKT<F, readonly [(a: A) => B, S]>
    ) => ap_(fab, fa)
  });
}
