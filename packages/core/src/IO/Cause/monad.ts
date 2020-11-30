import { identity } from "../../Function";
import * as Sy from "../../Sync";
import { both, then } from "./constructors";
import { empty } from "./empty";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Monad Cause
 * -------------------------------------------
 */

export function chainSafe_<E, D>(
  fa: Cause<E>,
  f: (e: E) => Cause<D>
): Sy.Sync<unknown, never, Cause<D>> {
  return Sy.gen(function* (_) {
    switch (fa._tag) {
      case "Empty":
        return empty;
      case "Fail":
        return f(fa.value);
      case "Die":
        return fa;
      case "Interrupt":
        return fa;
      case "Then":
        return then(yield* _(chainSafe_(fa.left, f)), yield* _(chainSafe_(fa.right, f)));
      case "Both":
        return both(yield* _(chainSafe_(fa.left, f)), yield* _(chainSafe_(fa.right, f)));
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
export function chain_<E, D>(fa: Cause<E>, f: (e: E) => Cause<D>): Cause<D> {
  return Sy.runIO(chainSafe_(fa, f));
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
export function chain<E, D>(f: (e: E) => Cause<D>): (fa: Cause<E>) => Cause<D> {
  return (fa) => chain_(fa, f);
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
export function flatten<E>(ffa: Cause<Cause<E>>): Cause<E> {
  return chain_(ffa, identity);
}
