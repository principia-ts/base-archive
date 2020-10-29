import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../XPure";
import { Functor } from "./functor";
import type { IO, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * both_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `IO`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const both_: <A, B>(fa: IO<A>, fb: IO<B>) => IO<readonly [A, B]> = X.both_;

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `IO`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const both = <B>(fb: IO<B>) => <A>(fa: IO<A>): IO<readonly [A, B]> => both_(fa, fb);

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `IO`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <A>(a: A) => IO<A> = X.pure;

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});
