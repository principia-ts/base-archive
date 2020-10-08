import * as A from "@principia/core/Array";
import * as C from "@principia/core/Const";
import type { Either } from "@principia/core/Either";
import type { Predicate, Refinement } from "@principia/core/Function";
import { identity, pipe } from "@principia/core/Function";
import type * as HKT from "@principia/core/HKT";
import * as I from "@principia/core/Identity";
import type { Option } from "@principia/core/Option";
import type * as TC from "@principia/core/typeclass-index";

import * as _ from "../internal";
import { fromTraversable } from "./constructors";
import { compose } from "./methods";
import type { Traversal } from "./Traversal";

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modify = <A>(f: (a: A) => A) => <S>(sa: Traversal<S, A>): ((s: S) => S) => sa.modifyF(I.Applicative)(f);

/**
 * @category Combinators
 * @since 1.0.0
 */
export const set = <A>(a: A): (<S>(sa: Traversal<S, A>) => (s: S) => S) => {
   return modify(() => a);
};

/**
 * @category Combinators
 * @since 1.0.0
 */
export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Traversal<S, A>) => Traversal<S, B>;
   <A>(predicate: Predicate<A>): <S>(sa: Traversal<S, A>) => Traversal<S, A>;
} = <A>(predicate: Predicate<A>): (<S>(sa: Traversal<S, A>) => Traversal<S, A>) =>
   compose(_.prismAsTraversal(_.prismFromPredicate(predicate)));

/**
 * Return a `Traversal` from a `Traversal` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export const prop = <A, P extends keyof A>(prop: P): (<S>(sa: Traversal<S, A>) => Traversal<S, A[P]>) =>
   compose(pipe(_.lensId<A>(), _.lensProp(prop), _.lensAsTraversal));

/**
 * Return a `Traversal` from a `Traversal` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export const props = <A, P extends keyof A>(
   ...props: [P, P, ...Array<P>]
): (<S>(sa: Traversal<S, A>) => Traversal<S, { [K in P]: A[K] }>) =>
   compose(pipe(_.lensId<A>(), _.lensProps(...props), _.lensAsTraversal));

/**
 * Return a `Traversal` from a `Traversal` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export const component = <A extends ReadonlyArray<unknown>, P extends keyof A>(
   prop: P
): (<S>(sa: Traversal<S, A>) => Traversal<S, A[P]>) =>
   compose(pipe(_.lensId<A>(), _.lensComponent(prop), _.lensAsTraversal));

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const index = (i: number) => <S, A>(sa: Traversal<S, ReadonlyArray<A>>): Traversal<S, A> =>
   pipe(sa, compose(_.optionalAsTraversal(_.indexArray<A>().index(i))));

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export const key = (key: string) => <S, A>(sa: Traversal<S, Readonly<Record<string, A>>>): Traversal<S, A> =>
   pipe(sa, compose(_.optionalAsTraversal(_.indexRecord<A>().index(key))));

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export const atKey = (key: string) => <S, A>(sa: Traversal<S, Readonly<Record<string, A>>>): Traversal<S, Option<A>> =>
   pipe(sa, compose(_.lensAsTraversal(_.atRecord<A>().at(key))));

/**
 * Return a `Traversal` from a `Traversal` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Traversal<S, Option<A>>) => Traversal<S, A> = compose(_.prismAsTraversal(_.prismSome()));

/**
 * Return a `Traversal` from a `Traversal` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Traversal<S, Either<E, A>>) => Traversal<S, A> = compose(
   _.prismAsTraversal(_.prismRight())
);

/**
 * Return a `Traversal` from a `Traversal` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Traversal<S, Either<E, A>>) => Traversal<S, E> = compose(
   _.prismAsTraversal(_.prismLeft())
);

/**
 * Return a `Traversal` from a `Traversal` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverse = <T extends HKT.URIS, C = HKT.Auto>(
   T: TC.Traversable<T, C>
): (<N extends string, K, Q, W, X, I, S_, R, S, A>(
   sta: Traversal<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, S, A>>
) => Traversal<S, A>) => compose(fromTraversable(T)());

/**
 * Map each target to a `Monoid` and combine the results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foldMap = <M>(M: TC.Monoid<M>) => <A>(f: (a: A) => M) => <S>(sa: Traversal<S, A>): ((s: S) => M) =>
   sa.modifyF(C.getApplicative(M))((a) => C.make(f(a)));

/**
 * Map each target to a `Monoid` and combine the results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fold = <A>(M: TC.Monoid<A>): (<S>(sa: Traversal<S, A>) => (s: S) => A) => foldMap(M)(identity);

/**
 * Get all the targets of a `Traversal`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const getAll = <S>(s: S) => <A>(sa: Traversal<S, A>): ReadonlyArray<A> =>
   foldMap(A.getMonoid<A>())((a: A) => [a])(sa)(s);
