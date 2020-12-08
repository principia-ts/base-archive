import { identity } from "../../Function";
import * as Sy from "../../Sync";
import { both, then, traced } from "./constructors";
import { empty } from "./empty";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Monad Cause
 * -------------------------------------------
 */

export function chainSafe_<E, D>(
  ma: Cause<E>,
  f: (e: E) => Cause<D>
): Sy.Sync<unknown, never, Cause<D>> {
  return Sy.gen(function* (_) {
    switch (ma._tag) {
      case "Empty":
        return empty;
      case "Fail":
        return f(ma.value);
      case "Die":
        return ma;
      case "Interrupt":
        return ma;
      case "Then":
        return then(yield* _(chainSafe_(ma.left, f)), yield* _(chainSafe_(ma.right, f)));
      case "Both":
        return both(yield* _(chainSafe_(ma.left, f)), yield* _(chainSafe_(ma.right, f)));
      case "Traced":
        return traced(yield* _(chainSafe_(ma.cause, f)), ma.trace);
    }
  });
}

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Cause<D> {
  return Sy.runIO(chainSafe_(ma, f));
}

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain<E, D>(f: (e: E) => Cause<D>): (ma: Cause<E>) => Cause<D> {
  return (ma) => chain_(ma, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Cuase`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E>(mma: Cause<Cause<E>>): Cause<E> {
  return chain_(mma, identity);
}
