import type { Either } from "../Either";
import type { Lazy } from "../Function";
import { fromNullable, none, some } from "./constructors";
import { isNone } from "./guards";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Option Combinators
 * -------------------------------------------
 */

/**
 * chainNullableK_ :: Option m => (m a, (a -> ?b)) -> m b
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function chainNullableK_<A, B>(fa: Option<A>, f: (a: A) => B | null | undefined): Option<B> {
   return isNone(fa) ? none() : fromNullable(f(fa.value));
}

/**
 * chainNullableK :: Option m => (a -> ?b) -> m a -> m b
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function chainNullableK<A, B>(f: (a: A) => B | null | undefined): (fa: Option<A>) => Option<B> {
   return (fa) => chainNullableK_(fa, f);
}

/**
 * orElse_ :: Option m => (m a, () -> m b) -> m (a | b)
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse_<A, B>(fa: Option<A>, onNothing: Lazy<Option<B>>): Option<A | B> {
   return isNone(fa) ? onNothing() : fa;
}

/**
 * orElse :: Option m => (() -> m b) -> m a -> m (a | b)
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse<B>(onNothing: Lazy<Option<B>>): <A>(fa: Option<A>) => Option<B | A> {
   return (fa) => orElse_(fa, onNothing);
}

/**
 * getLeft :: (Either e, Option m) => e a b -> m a
 * Evaluates an `Either` and returns a `Option` carrying the left value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getLeft<E, A>(fea: Either<E, A>): Option<E> {
   return fea._tag === "Right" ? none() : some(fea.left);
}

/**
 * getRight :: (Either e, Option m) => e a b -> m b
 * Evaluates an `Either` and returns a `Option` carrying the right value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getRight<E, A>(fea: Either<E, A>): Option<A> {
   return fea._tag === "Left" ? none() : some(fea.right);
}
