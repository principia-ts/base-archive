import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import type { Exit } from "../../Exit/model";
import { chain_, done, foldCauseM_, halt, pure, result } from "../_core";
import type { AIO } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * ```haskell
 * bracketExit_ :: (
 *    AIO r e a,
 *    (a -> AIO r1 e1 b),
 *    ((a, (Exit e1 b)) -> AIO r2 e2 _)
 * ) -> AIO (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` AIO
 * succeeds. If `use` fails, then after release, the returned AIO will fail
 * with the same error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketExit_<R, E, A, E1, R1, A1, R2, E2>(
  acquire: AIO<R, E, A>,
  use: (a: A) => AIO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => AIO<R2, E2, any>
): AIO<R & R1 & R2, E | E1 | E2, A1> {
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
 *    (a -> AIO r1 e1 b),
 *    ((a, (Exit e1 b)) -> AIO r2 e2 _)
 * ) -> AIO r e a -> AIO (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` AIO
 * succeeds. If `use` fails, then after release, the returned AIO will fail
 * with the same error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketExit<A, R1, E1, B, R2, E2, C>(
  use: (a: A) => AIO<R1, E1, B>,
  release: (a: A, e: Exit<E1, B>) => AIO<R2, E2, C>
): <R, E>(acquire: AIO<R, E, A>) => AIO<R & R1 & R2, E1 | E2 | E, B> {
  return (acquire) => bracketExit_(acquire, use, release);
}

/**
 * ```haskell
 * bracket_ :: (
 *    AIO r e a,
 *    (a -> AIO r1 e1 a1),
 *    (a -> AIO r2 e2 a2)
 * ) -> AIO (r & r1 & r2) (e | e1 | e2) a1
 * ```
 *
 * When this AIO represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this AIO, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` AIO will not be interrupted, and will be
 * executed so long as this AIO successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` AIO is
 * executed.
 *
 * If the `release` AIO fails, then the entire AIO will fail even
 * if the `use` AIO succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` AIO can be caught and ignored.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracket_<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: AIO<R, E, A>,
  use: (a: A) => AIO<R1, E1, A1>,
  release: (a: A) => AIO<R2, E2, A2>
): AIO<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, release);
}

/**
 * ```haskell
 * bracket :: (
 *    (a -> AIO r1 e1 b),
 *    (a -> AIO r2 e2 c)
 * ) -> AIO r e a -> AIO (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * When this AIO represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this AIO, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` AIO will not be interrupted, and will be
 * executed so long as this AIO successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` AIO is
 * executed.
 *
 * If the `release` AIO fails, then the entire AIO will fail even
 * if the `use` AIO succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` AIO can be caught and ignored.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracket<A, R1, E1, B, R2, E2, C>(
  use: (a: A) => AIO<R1, E1, B>,
  release: (a: A) => AIO<R2, E2, C>
): <R, E>(acquire: AIO<R, E, A>) => AIO<R & R1 & R2, E1 | E2 | E, B> {
  return (acquire) => bracketExit_(acquire, use, release);
}

/**
 * Returns an AIO that, if this AIO _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this AIO
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the AIO's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 */
export function ensuring<R>(
  finalizer: AIO<R, never, any>
): <R1, E, A>(ma: AIO<R1, E, A>) => AIO<R1 & R, E, A> {
  return (ma) =>
    uninterruptibleMask(({ restore }) =>
      foldCauseM_(
        restore(ma),
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
