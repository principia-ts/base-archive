import type { Either } from "@principia/core/Either";
import type { Predicate, Refinement } from "@principia/core/Function";
import { flow, pipe } from "@principia/core/Function";
import type * as HKT from "@principia/core/HKT";
import type { Option } from "@principia/core/Option";
import type * as TC from "@principia/core/typeclass-index";

import * as _ from "../internal";
import type { Optional } from "../Optional";
import type { Traversal } from "../Traversal";
import { compose, composeOptional, composePrism } from "./compositions";
import { asOptional, asTraversal } from "./converters";
import type { Lens } from "./Lens";

/*
 * -------------------------------------------
 * Lens Combinators
 * -------------------------------------------
 */

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modify = <A>(f: (a: A) => A) => <S>(sa: Lens<S, A>) => (s: S): S => {
   const o = sa.get(s);
   const n = f(o);
   return o === n ? s : sa.set(n)(s);
};

/**
 * Return a `Optional` from a `Lens` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fromNullable = <S, A>(sa: Lens<S, A>): Optional<S, NonNullable<A>> =>
   _.lensComposePrism(_.prismFromNullable<A>())(sa);

/**
 * @category Combinators
 * @since 1.0.0
 */
export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Lens<S, A>) => Optional<S, B>;
   <A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A>;
} = <A>(predicate: Predicate<A>): (<S>(sa: Lens<S, A>) => Optional<S, A>) =>
   composePrism(_.prismFromPredicate(predicate));

/**
 * Return a `Lens` from a `Lens` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export const prop: <A, P extends keyof A>(prop: P) => <S>(sa: Lens<S, A>) => Lens<S, A[P]> = _.lensProp;

/**
 * Return a `Lens` from a `Lens` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export const props: <A, P extends keyof A>(
   ...props: [P, P, ...Array<P>]
) => <S>(sa: Lens<S, A>) => Lens<S, { [K in P]: A[K] }> = _.lensProps;

/**
 * Return a `Lens` from a `Lens` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export const component: <A extends ReadonlyArray<unknown>, P extends keyof A>(
   prop: P
) => <S>(sa: Lens<S, A>) => Lens<S, A[P]> = _.lensComponent;

/**
 * Return a `Optional` from a `Lens` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const index = (i: number) => <S, A>(sa: Lens<S, ReadonlyArray<A>>): Optional<S, A> =>
   pipe(sa, asOptional, _.optionalComposeOptional(_.indexArray<A>().index(i)));

/**
 * Return a `Optional` from a `Lens` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export const key = (key: string) => <S, A>(sa: Lens<S, Readonly<Record<string, A>>>): Optional<S, A> =>
   pipe(sa, asOptional, _.optionalComposeOptional(_.indexRecord<A>().index(key)));

/**
 * Return a `Lens` from a `Lens` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 */
export const atKey = (key: string) => <S, A>(sa: Lens<S, Readonly<Record<string, A>>>): Lens<S, Option<A>> =>
   pipe(sa, compose(_.atRecord<A>().at(key)));

/**
 * Return a `Optional` from a `Lens` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Lens<S, Option<A>>) => Optional<S, A> = composePrism(_.prismSome());

/**
 * Return a `Optional` from a `Lens` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Lens<S, Either<E, A>>) => Optional<S, A> = composePrism(_.prismRight());

/**
 * Return a `Optional` from a `Lens` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Lens<S, Either<E, A>>) => Optional<S, E> = composePrism(_.prismLeft());

/**
 * Return a `Traversal` from a `Lens` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverse = <T extends HKT.URIS, C = HKT.Auto>(
   T: TC.Traversable<T, C>
): (<S, N extends string, K, Q, W, X, I, S_, R, E, A>(
   sta: Lens<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, E, A>>
) => Traversal<S, A>) => flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()));

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findl: <A>(predicate: Predicate<A>) => <S>(sa: Lens<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
   _.findFirst,
   composeOptional
);
