import { Either } from "../Either";
import { Lazy } from "../Function";
import { fromNullable, just, nothing } from "./constructors";
import { isNothing } from "./guards";
import type { Maybe } from "./Maybe";

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * _mapNullable :: Maybe m => (m a, (a -> ?b)) -> m b
 * Map over a Maybe with a function that returns a nullable value
 *
 * @category Uncurried Maybe Combinators
 * @since 1.0.0
 */
export const _mapNullable = <A, B>(fa: Maybe<A>, f: (a: A) => B | null | undefined): Maybe<B> =>
   isNothing(fa) ? nothing() : fromNullable(f(fa.value));

/**
 * mapNullable :: Maybe m => (a -> ?b) -> m a -> m b
 * Map over a Maybe with a function that returns a nullable value
 *
 * @category Maybe Combinators
 * @since 1.0.0
 */
export const mapNullable: <A, B>(f: (a: A) => B | null | undefined) => (fa: Maybe<A>) => Maybe<B> = (f) => (fa) =>
   _mapNullable(fa, f);

/**
 * _orElse :: Maybe m => (m a, () -> m b) -> m (a | b)
 * Evaluate and return alternate optional value if empty
 *
 * @category Uncurried Maybe Combinators
 * @since 1.0.0
 */
export const _orElse = <A, B>(fa: Maybe<A>, onNothing: Lazy<Maybe<B>>): Maybe<A | B> =>
   isNothing(fa) ? onNothing() : fa;

/**
 * orElse :: Maybe m => (() -> m b) -> m a -> m (a | b)
 * Evaluate and return alternate optional value if empty
 *
 * @category Maybe Combinators
 * @since 1.0.0
 */
export const orElse = <B>(onNothing: Lazy<Maybe<B>>) => <A>(fa: Maybe<A>): Maybe<A | B> => _orElse(fa, onNothing);

/**
 * getLeft :: (Either e, Maybe m) => e a b -> m a
 * Evaluates an `Either` and returns a `Maybe` carrying the left value, if it exists
 *
 * @category Maybe Combinators
 * @since 1.0.0
 */
export const getLeft = <E, A>(fea: Either<E, A>): Maybe<E> => (fea._tag === "Right" ? nothing() : just(fea.left));

/**
 * getRight :: (Either e, Maybe m) => e a b -> m b
 * Evaluates an `Either` and returns a `Maybe` carrying the right value, if it exists
 *
 * @category Maybe Combinators
 * @since 1.0.0
 */
export const getRight = <E, A>(fea: Either<E, A>): Maybe<A> => (fea._tag === "Left" ? nothing() : just(fea.right));
