import type { AIO, EIO, RIO } from "./model";
import { GiveInstruction, ReadInstruction, SucceedInstruction } from "./model";

/**
 * ```haskell
 * asks :: MonadEnv m => (r -> a) -> m r a
 * ```
 *
 * Accesses the environment provided to an `AIO`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function asks<R, A>(f: (_: R) => A): RIO<R, A> {
  return new ReadInstruction((_: R) => new SucceedInstruction(f(_)));
}

/**
 * ```haskell
 * asksM :: MonadEnv m => (q -> m r a) -> m (r & q) a
 * ```
 *
 * AIOfully accesses the environment provided to an `AIO`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function asksM<Q, R, E, A>(f: (r: Q) => AIO<R, E, A>): AIO<R & Q, E, A> {
  return new ReadInstruction(f);
}

/**
 * ```haskell
 * giveAll_ :: MonadEnv m => (m r a, r) -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `AIO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function giveAll_<R, E, A>(ma: AIO<R, E, A>, r: R): EIO<E, A> {
  return new GiveInstruction(ma, r);
}

/**
 * ```haskell
 * giveAll :: MonadEnv m => r -> m r a -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `AIO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function giveAll<R>(r: R): <E, A>(ma: AIO<R, E, A>) => AIO<unknown, E, A> {
  return (ma) => giveAll_(ma, r);
}

/**
 * ```haskell
 * gives_ :: MonadEnv m => (m r a, (r0 -> r)) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `AIO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function gives_<R0, R, E, A>(ma: AIO<R, E, A>, f: (r0: R0) => R) {
  return asksM((r0: R0) => giveAll_(ma, f(r0)));
}

/**
 * ```haskell
 * gives :: MonadEnv m => (r0 -> r) -> m r a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `AIO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: AIO<R, E, A>) => AIO<R0, E, A> {
  return (ma) => gives_(ma, f);
}

/**
 * ```haskell
 * give_ :: MonadEnv m => (m (r & r0) a, r) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function give_<E, A, R = unknown, R0 = unknown>(ma: AIO<R & R0, E, A>, r: R): AIO<R0, E, A> {
  return gives_(ma, (r0) => ({ ...r0, ...r }));
}

/**
 * ```haskell
 * give :: MonadEnv m => r -> m (r & r0) a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `AIO`,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function give<R = unknown>(
  r: R
): <E, A, R0 = unknown>(ma: AIO<R & R0, E, A>) => AIO<R0, E, A> {
  return (ma) => give_(ma, r);
}

export function ask<R>(): AIO<R, never, R> {
  return asks((_: R) => _);
}
