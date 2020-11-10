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
export const fold_ = <E, A, B>(
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
