import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { flow, identity, pipe } from "../Function";
import { Functor, map } from "./functor";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Option
 * -------------------------------------------
 */
/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Uncurried Monad
 * @since 1.0.0
 */
export function chain_<A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<B> {
   return isNone(ma) ? ma : f(ma.value);
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
export function chain<A, B>(f: (a: A) => Option<B>): (ma: Option<A>) => Option<B> {
   return (ma) => chain_(ma, f);
}

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<A> {
   return chain_(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );
}

/**
 * ```haskell
 * tap :: Monad m => m a -> (a -> m b) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap<A, B>(f: (a: A) => Option<B>): (ma: Option<A>) => Option<A> {
   return (ma) => tap_(ma, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Option`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: <A>(mma: Option<Option<A>>) => Option<A> = flow(chain(identity));

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});
