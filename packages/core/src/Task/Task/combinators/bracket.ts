import { chain_, done, foldCauseM_, halt, pure, result } from "../_core";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import type { Exit } from "../../Exit/model";
import type { Task } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * ```haskell
 * bracketExit_ :: (
 *    Task r e a,
 *    (a -> Task r1 e1 b),
 *    ((a, (Exit e1 b)) -> Task r2 e2 _)
 * ) -> Task (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketExit_<R, E, A, E1, R1, A1, R2, E2>(
  acquire: Task<R, E, A>,
  use: (a: A) => Task<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Task<R2, E2, any>
): Task<R & R1 & R2, E | E1 | E2, A1> {
  return uninterruptibleMask(({ restore }) =>
    chain_(acquire, (a) =>
      chain_(result(restore(use(a))), (e) =>
        foldCauseM_(
          release(a, e),
          (cause2) =>
            halt(
              Ex.fold_(
                e,
                (_) => C.then(_, cause2),
                (_) => cause2
              )
            ),
          (_) => done(e)
        )
      )
    )
  );
}

/**
 * ```haskell
 * bracketExit :: (
 *    (a -> Task r1 e1 b),
 *    ((a, (Exit e1 b)) -> Task r2 e2 _)
 * ) -> Task r e a -> Task (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketExit<A, R1, E1, B, R2, E2, C>(
  use: (a: A) => Task<R1, E1, B>,
  release: (a: A, e: Exit<E1, B>) => Task<R2, E2, C>
): <R, E>(acquire: Task<R, E, A>) => Task<R & R1 & R2, E1 | E2 | E, B> {
  return (acquire) => bracketExit_(acquire, use, release);
}

/**
 * ```haskell
 * bracket_ :: (
 *    Task r e a,
 *    (a -> Task r1 e1 a1),
 *    (a -> Task r2 e2 a2)
 * ) -> Task (r & r1 & r2) (e | e1 | e2) a1
 * ```
 *
 * When this effect represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this effect, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` effect will not be interrupted, and will be
 * executed so long as this effect successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even
 * if the `use` effect succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` effect can be caught and ignored.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracket_<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: Task<R, E, A>,
  use: (a: A) => Task<R1, E1, A1>,
  release: (a: A) => Task<R2, E2, A2>
): Task<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, release);
}

/**
 * ```haskell
 * bracket :: (
 *    (a -> Task r1 e1 b),
 *    (a -> Task r2 e2 c)
 * ) -> Task r e a -> Task (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * When this effect represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this effect, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` effect will not be interrupted, and will be
 * executed so long as this effect successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even
 * if the `use` effect succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` effect can be caught and ignored.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracket<A, R1, E1, B, R2, E2, C>(
  use: (a: A) => Task<R1, E1, B>,
  release: (a: A) => Task<R2, E2, C>
): <R, E>(acquire: Task<R, E, A>) => Task<R & R1 & R2, E1 | E2 | E, B> {
  return (acquire) => bracketExit_(acquire, use, release);
}

/**
 * Returns a task that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 */
export function ensuring<R>(
  finalizer: Task<R, never, any>
): <R1, E, A>(effect: Task<R1, E, A>) => Task<R1 & R, E, A> {
  return (effect) =>
    uninterruptibleMask(({ restore }) =>
      foldCauseM_(
        restore(effect),
        (cause1) =>
          foldCauseM_(
            finalizer,
            (cause2) => halt(C.then(cause1, cause2)),
            (_) => halt(cause1)
          ),
        (value) =>
          foldCauseM_(
            finalizer,
            (cause1) => halt(cause1),
            (_) => pure(value)
          )
      )
    );
}
