import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { StateT, V } from "./model";
import { getMonad } from "./monad";

export function getMonadState<F extends HKT.URIS, C>(
  M: P.Monad<F, C>
): P.MonadState<StateT<F>, V<C>>;
export function getMonadState<F>(
  M: P.Monad<HKT.UHKT<F>>
): P.MonadState<StateT<HKT.UHKT<F>>, V<HKT.Auto>> {
  const pureM = P.pureF(M);
  return HKT.instance({
    ...getMonad(M),
    get: <S>() => (s: S) => pureM([s, s]),
    put: <S>(s: S) => () => pureM([undefined, s]),
    modify: <S>(f: (s: S) => S) => (s: S) => pureM([undefined, f(s)]),
    gets: <S, A>(f: (s: S) => A) => (s: S) => pureM([f(s), s])
  });
}
