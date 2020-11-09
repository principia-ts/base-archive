import type { EIO, RIO, Task } from "./model";
import { GiveInstruction, ReadInstruction, SucceedInstruction } from "./model";

/**
 * ```haskell
 * asks :: MonadEnv m => (r -> a) -> m r a
 * ```
 *
 * Accesses the environment provided to an `Task`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const asks = <R, A>(f: (_: R) => A): RIO<R, A> => new ReadInstruction((_: R) => new SucceedInstruction(f(_)));

/**
 * ```haskell
 * asksM :: MonadEnv m => (q -> m r a) -> m (r & q) a
 * ```
 *
 * Taskfully accesses the environment provided to an `Task`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const asksM = <Q, R, E, A>(f: (r: Q) => Task<R, E, A>): Task<R & Q, E, A> => new ReadInstruction(f);

/**
 * ```haskell
 * giveAll_ :: MonadEnv m => (m r a, r) -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `Task` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const giveAll_ = <R, E, A>(ma: Task<R, E, A>, r: R): EIO<E, A> => new GiveInstruction(ma, r);

/**
 * ```haskell
 * giveAll :: MonadEnv m => r -> m r a -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `Task` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const giveAll = <R>(r: R) => <E, A>(ma: Task<R, E, A>): Task<unknown, E, A> => giveAll_(ma, r);

/**
 * ```haskell
 * gives_ :: MonadEnv m => (m r a, (r0 -> r)) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `Task`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const gives_ = <R0, R, E, A>(ma: Task<R, E, A>, f: (r0: R0) => R) => asksM((r0: R0) => giveAll_(ma, f(r0)));

/**
 * ```haskell
 * gives :: MonadEnv m => (r0 -> r) -> m r a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `Task`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const gives = <R0, R>(f: (r0: R0) => R) => <E, A>(ma: Task<R, E, A>): Task<R0, E, A> => gives_(ma, f);

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
export const give_ = <E, A, R = unknown, R0 = unknown>(ma: Task<R & R0, E, A>, r: R): Task<R0, E, A> =>
   gives_(ma, (r0) => ({ ...r0, ...r }));

/**
 * ```haskell
 * give :: MonadEnv m => r -> m (r & r0) a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `Task`,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const give = <R = unknown>(r: R) => <E, A, R0 = unknown>(ma: Task<R & R0, E, A>): Task<R0, E, A> => give_(ma, r);

export const ask = <R>(): Task<R, never, R> => asks((_: R) => _);
