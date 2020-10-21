import { pipe } from "../../Function";
import { some } from "../../Option";
import type { Cause } from "../Cause";
import * as T from "../Effect/core";
import * as Ex from "../Exit/core";
import type { Exit } from "../Exit/Exit";
import type { Fiber, RuntimeFiber, SyntheticFiber } from "./Fiber";
import { InterruptStatus } from "./Fiber";
import type { FiberId } from "./FiberId";

/**
 * ```haskell
 * _fold :: (
 *    Fiber e a,
 *    ((Runtime e a) -> b),
 *    ((Synthetic e a) -> b)
 * ) -> b
 * ```
 *
 * Folds over the runtime or synthetic fiber.
 */
export const _fold = <E, A, B>(
   fiber: Fiber<E, A>,
   onRuntime: (_: RuntimeFiber<E, A>) => B,
   onSynthetic: (_: SyntheticFiber<E, A>) => B
): B => pipe(fiber, fold(onRuntime, onSynthetic));

/**
 * ```haskell
 * fold :: (((Runtime e a) -> b), ((Synthetic e a) -> b)) -> Fiber e a -> b
 * ```
 *
 * Folds over the runtime or synthetic fiber.
 */
export const fold = <E, A, B>(onRuntime: (_: RuntimeFiber<E, A>) => B, onSynthetic: (_: SyntheticFiber<E, A>) => B) => (
   fiber: Fiber<E, A>
) => {
   switch (fiber._tag) {
      case "RuntimeFiber": {
         return onRuntime(fiber);
      }
      case "SyntheticFiber": {
         return onSynthetic(fiber);
      }
   }
};

export const done = <E, A>(exit: Exit<E, A>): SyntheticFiber<E, A> => ({
   _tag: "SyntheticFiber",
   await: T.pure(exit),
   getRef: (ref) => T.pure(ref.initial),
   inheritRefs: T.unit,
   interruptAs: () => T.pure(exit),
   poll: T.pure(some(exit))
});

export const succeed = <A>(a: A): SyntheticFiber<never, A> => done(Ex.succeed(a));

export const fail = <E>(e: E): SyntheticFiber<E, never> => done(Ex.fail(e));

export const halt = <E>(cause: Cause<E>) => done(Ex.failure(cause));

export const interruptAs = (id: FiberId) => done(Ex.interrupt(id));

export const interruptible = new InterruptStatus(true);

export const uninterruptible = new InterruptStatus(false);

export const interruptStatus = (b: boolean) => (b ? interruptible : uninterruptible);
