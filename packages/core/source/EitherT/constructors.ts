import * as E from "../Either";
import * as HKT from "../HKT";
import * as TC from "../typeclass-index";

export const left = <F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>) => <E = never, A = never>(l: E) =>
   M.pure(E.left(l));

export const right = <F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>) => <E = never, A = never>(r: A) =>
   M.pure(E.right<E, A>(r));

export const leftM = <F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>) => <
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
): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, E.Either<A, never>> => M._map(ma, (a) => E.left<A, never>(a));

export const rightM = <F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>) => <
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
): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, E.Either<never, A>> => M._map(ma, E.right);
