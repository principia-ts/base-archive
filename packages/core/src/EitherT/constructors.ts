import type * as P from "@principia/prelude";
import { pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as E from "../Either";

export const left = <F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>) => <E>(l: E) =>
  pureF(M)(E.left(l));

export const right = <F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>) => <A>(r: A) =>
  pureF(M)(E.right(r));

export const leftM = <F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>) => <
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A
>(
  ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, E.Either<A, never>> => M.map_(ma, E.left);

export const rightM = <F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>) => <
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A
>(
  ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, E.Either<never, A>> => M.map_(ma, E.right);
