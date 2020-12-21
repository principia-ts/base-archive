import type * as HKT from "./HKT";
import type { Monad } from "./Monad";

export interface MonadEnv<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
  readonly asks: AsksFn<F, C>;
  readonly give: GiveFn<F, C>;
}

export interface AsksFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    R,
    N extends string = HKT.Initial<C, "N">,
    K = HKT.Initial<C, "K">,
    Q = HKT.Initial<C, "Q">,
    W = HKT.Initial<C, "W">,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    E = HKT.Initial<C, "E">
  >(
    f: (_: R) => A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>;
}

export interface AsksMFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
    f: (_: R0) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, HKT.Mix<C, "R", [R, R0]>, E, A>;
}

export interface GiveAllFn<F extends HKT.URIS, TC = HKT.Auto> {
  <R>(r: R): <N extends string, K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, unknown, E, A>;
}

export interface GiveAllFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    r: R
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, unknown, E, A>;
}

export interface GiveFn<F extends HKT.URIS, TC = HKT.Auto> {
  <R>(r: R): <N extends string, K, Q, W, X, I, S, R0, E, A>(
    ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R & R0, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R0, E, A>;
}

export interface GiveFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R & R0, E, A>,
    r: R
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R0, E, A>;
}

export interface GivesFn<F extends HKT.URIS, C = HKT.Auto> {
  <R0, R>(f: (r0: R0) => R): <N extends string, K, Q, W, X, I, S, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>;
}

export interface GivesFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (r0: R0) => R
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>;
}
