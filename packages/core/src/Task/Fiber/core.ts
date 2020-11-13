import { pipe } from "../../Function";
import type { Fiber, RuntimeFiber, SyntheticFiber } from "./model";

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
export function fold_<E, A, B>(
   fiber: Fiber<E, A>,
   onRuntime: (_: RuntimeFiber<E, A>) => B,
   onSynthetic: (_: SyntheticFiber<E, A>) => B
): B {
   switch (fiber._tag) {
      case "RuntimeFiber": {
         return onRuntime(fiber);
      }
      case "SyntheticFiber": {
         return onSynthetic(fiber);
      }
   }
}

/**
 * ```haskell
 * fold :: (((Runtime e a) -> b), ((Synthetic e a) -> b)) -> Fiber e a -> b
 * ```
 *
 * Folds over the runtime or synthetic fiber.
 */
export function fold<E, A, B>(
   onRuntime: (_: RuntimeFiber<E, A>) => B,
   onSynthetic: (_: SyntheticFiber<E, A>) => B
): (fiber: Fiber<E, A>) => B {
   return (fiber) => fold_(fiber, onRuntime, onSynthetic);
}
