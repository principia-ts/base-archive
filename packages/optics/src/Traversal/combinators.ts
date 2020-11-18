import * as A from "@principia/core/Array";
import * as C from "@principia/core/Const";
import type { Either } from "@principia/core/Either";
import type { Predicate, Refinement } from "@principia/core/Function";
import { identity, pipe } from "@principia/core/Function";
import * as I from "@principia/core/Identity";
import type { Option } from "@principia/core/Option";
import type * as TC from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as _ from "../internal";
import { compose } from "./category";
import { fromTraversable } from "./constructors";
import type { Traversal } from "./model";

/**
 * @category Combinators
 * @since 1.0.0
 */
export function modify<A>(f: (a: A) => A): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return (sa) => sa.modifyF(I.Applicative)(f);
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function set<A>(a: A): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return modify(() => a);
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): <S>(sa: Traversal<S, A>) => Traversal<S, B>;
export function filter<A>(predicate: Predicate<A>): <S>(sa: Traversal<S, A>) => Traversal<S, A>;
export function filter<A>(predicate: Predicate<A>): <S>(sa: Traversal<S, A>) => Traversal<S, A> {
  return compose(_.prismAsTraversal(_.prismFromPredicate(predicate)));
}

/**
 * Return a `Traversal` from a `Traversal` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export function prop<A, P extends keyof A>(
  prop: P
): <S>(sa: Traversal<S, A>) => Traversal<S, A[P]> {
  return compose(pipe(_.lensId<A>(), _.lensProp(prop), _.lensAsTraversal));
}

/**
 * Return a `Traversal` from a `Traversal` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(
  sa: Traversal<S, A>
) => Traversal<
  S,
  {
    [K in P]: A[K];
  }
> {
  return compose(pipe(_.lensId<A>(), _.lensProps(...props), _.lensAsTraversal));
}

/**
 * Return a `Traversal` from a `Traversal` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: Traversal<S, A>) => Traversal<S, A[P]> {
  return compose(pipe(_.lensId<A>(), _.lensComponent(prop), _.lensAsTraversal));
}

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index(i: number) {
  return <S, A>(sa: Traversal<S, ReadonlyArray<A>>): Traversal<S, A> =>
    pipe(sa, compose(_.optionalAsTraversal(_.indexArray<A>().index(i))));
}

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key(key: string) {
  return <S, A>(sa: Traversal<S, Readonly<Record<string, A>>>): Traversal<S, A> =>
    pipe(sa, compose(_.optionalAsTraversal(_.indexRecord<A>().index(key))));
}

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function atKey(key: string) {
  return <S, A>(sa: Traversal<S, Readonly<Record<string, A>>>): Traversal<S, Option<A>> =>
    pipe(sa, compose(_.lensAsTraversal(_.atRecord<A>().at(key))));
}

/**
 * Return a `Traversal` from a `Traversal` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Traversal<S, Option<A>>) => Traversal<S, A> = compose(
  _.prismAsTraversal(_.prismSome())
);

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
export function traverse<T extends HKT.URIS, C = HKT.Auto>(
  T: TC.Traversable<T, C>
): <N extends string, K, Q, W, X, I, S_, R, S, A>(
  sta: Traversal<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, S, A>>
) => Traversal<S, A> {
  return compose(fromTraversable(T)());
}

/**
 * Map each target to a `Monoid` and combine the results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap<M>(
  M: TC.Monoid<M>
): <A>(f: (a: A) => M) => <S>(sa: Traversal<S, A>) => (s: S) => M {
  return (f) => (sa) => sa.modifyF(C.getApplicative(M))((a) => C.make(f(a)));
}

/**
 * Map each target to a `Monoid` and combine the results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fold<A>(M: TC.Monoid<A>): <S>(sa: Traversal<S, A>) => (s: S) => A {
  return foldMap(M)(identity);
}

/**
 * Get all the targets of a `Traversal`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getAll<S>(s: S) {
  return <A>(sa: Traversal<S, A>): ReadonlyArray<A> =>
    foldMap(A.getMonoid<A>())((a: A) => [a])(sa)(s);
}
