import type { Either } from "@principia/core/Either";
import type { Predicate, Refinement } from "@principia/core/Function";
import { flow, pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as _ from "../internal";
import type { Optional } from "../Optional";
import type { Traversal } from "../Traversal";
import { compose } from "./category";
import { composeLens, composeOptional } from "./compositions";
import { asOptional, asTraversal } from "./converters";
import type { Prism } from "./model";

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
export const modifyOption: <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S) => Option<S> = _.prismModifyOption;

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
export const fromNullable: <S, A>(sa: Prism<S, A>) => Prism<S, NonNullable<A>> = compose(_.prismFromNullable());

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B>;
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>;
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A> {
   return compose(_.prismFromPredicate(predicate));
}

/**
 * Return a `Optional` from a `Prism` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export function prop<A, P extends keyof A>(prop: P): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
   return composeLens(pipe(_.lensId<A>(), _.lensProp(prop)));
}

/**
 * Return a `Optional` from a `Prism` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export function props<A, P extends keyof A>(
   ...props: [P, P, ...Array<P>]
): <S>(
   sa: Prism<S, A>
) => Optional<
   S,
   {
      [K in P]: A[K];
   }
> {
   return composeLens(pipe(_.lensId<A>(), _.lensProps(...props)));
}

/**
 * Return a `Optional` from a `Prism` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
   prop: P
): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
   return composeLens(pipe(_.lensId<A>(), _.lensComponent(prop)));
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index(i: number) {
   return <S, A>(sa: Prism<S, ReadonlyArray<A>>): Optional<S, A> =>
      pipe(sa, asOptional, _.optionalComposeOptional(_.indexArray<A>().index(i)));
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key(key: string) {
   return <S, A>(sa: Prism<S, Readonly<Record<string, A>>>): Optional<S, A> =>
      pipe(sa, asOptional, _.optionalComposeOptional(_.indexRecord<A>().index(key)));
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function atKey(key: string) {
   return <S, A>(sa: Prism<S, Readonly<Record<string, A>>>): Optional<S, Option<A>> =>
      _.prismComposeLens(_.atRecord<A>().at(key))(sa);
}

/**
 * Return a `Prism` from a `Prism` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Prism<S, Option<A>>) => Prism<S, A> = compose(_.prismSome());

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
export function traverse<T extends HKT.URIS, C = HKT.Auto>(
   T: P.Traversable<T, C>
): <S, N extends string, K, Q, W, X, I, S_, R, E, A>(
   sta: Prism<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, E, A>>
) => Traversal<S, A> {
   return flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()));
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findl: <A>(predicate: Predicate<A>) => <S>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
   _.findFirst,
   composeOptional
);
