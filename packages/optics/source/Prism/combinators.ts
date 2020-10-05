import { Either } from "@principia/core/Either";
import { flow, pipe, Predicate, Refinement } from "@principia/core/Function";
import type * as HKT from "@principia/core/HKT";
import type { Maybe } from "@principia/core/Maybe";
import type * as TC from "@principia/core/typeclass-index";

import * as _ from "../internal";
import type { Optional } from "../Optional";
import { Traversal } from "../Traversal";
import { compose, composeLens, composeOptional } from "./compositions";
import { asOptional, asTraversal } from "./converters";
import type { Prism } from "./Prism";

/*
 * -------------------------------------------
 * Prism Combinators
 * -------------------------------------------
 */

/**
 * @category Combinators
 * @since 1.0.0
 */
export const set: <A>(a: A) => <S>(sa: Prism<S, A>) => (s: S) => S = _.prismSet;

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modifyMaybe: <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S) => Maybe<S> =
   _.prismModifyMaybe;

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modify: <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S) => S = _.prismModify;

/**
 * Return a `Prism` from a `Prism` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fromNullable: <S, A>(sa: Prism<S, A>) => Prism<S, NonNullable<A>> = compose(
   _.prismFromNullable()
);

/**
 * @category Combinators
 * @since 1.0.0
 */
export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B>;
   <A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>;
} = <A>(predicate: Predicate<A>): (<S>(sa: Prism<S, A>) => Prism<S, A>) =>
   compose(_.prismFromPredicate(predicate));

/**
 * Return a `Optional` from a `Prism` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export const prop = <A, P extends keyof A>(prop: P): (<S>(sa: Prism<S, A>) => Optional<S, A[P]>) =>
   composeLens(pipe(_.lensId<A>(), _.lensProp(prop)));

/**
 * Return a `Optional` from a `Prism` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export const props = <A, P extends keyof A>(
   ...props: [P, P, ...Array<P>]
): (<S>(sa: Prism<S, A>) => Optional<S, { [K in P]: A[K] }>) =>
   composeLens(pipe(_.lensId<A>(), _.lensProps(...props)));

/**
 * Return a `Optional` from a `Prism` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export const component = <A extends ReadonlyArray<unknown>, P extends keyof A>(
   prop: P
): (<S>(sa: Prism<S, A>) => Optional<S, A[P]>) =>
   composeLens(pipe(_.lensId<A>(), _.lensComponent(prop)));

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const index = (i: number) => <S, A>(sa: Prism<S, ReadonlyArray<A>>): Optional<S, A> =>
   pipe(sa, asOptional, _.optionalComposeOptional(_.indexArray<A>().index(i)));

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export const key = (key: string) => <S, A>(
   sa: Prism<S, Readonly<Record<string, A>>>
): Optional<S, A> => pipe(sa, asOptional, _.optionalComposeOptional(_.indexRecord<A>().index(key)));

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export const atKey = (key: string) => <S, A>(
   sa: Prism<S, Readonly<Record<string, A>>>
): Optional<S, Maybe<A>> => _.prismComposeLens(_.atRecord<A>().at(key))(sa);

/**
 * Return a `Prism` from a `Prism` focused on the `Some` of a `Maybe` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Prism<S, Maybe<A>>) => Prism<S, A> = compose(_.prismSome());

/**
 * Return a `Prism` from a `Prism` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Prism<S, Either<E, A>>) => Prism<S, A> = compose(_.prismRight());

/**
 * Return a `Prism` from a `Prism` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Prism<S, Either<E, A>>) => Prism<S, E> = compose(_.prismLeft());

/**
 * Return a `Traversal` from a `Prism` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverse = <T extends HKT.URIS, C = HKT.Auto>(
   T: TC.Traversable<T, C>
): (<S, N extends string, K, Q, W, X, I, S_, R, E, A>(
   sta: Prism<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, E, A>>
) => Traversal<S, A>) => flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()));

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findl: <A>(
   predicate: Predicate<A>
) => <S>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> = flow(_.findFirst, composeOptional);
