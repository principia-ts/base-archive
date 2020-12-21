import type * as P from "../typeclass";
import type { Eq } from "./Eq";
import type { Show } from "./Show";

import * as HKT from "../HKT";
import { identity, unsafeCoerce } from "./Function";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type Const<E, A> = E & { readonly _A: A };

export const URI = "Const";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Const<E, A>;
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export function make<E, A = never>(e: E): Const<E, A> {
  return unsafeCoerce(e);
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplicative<E>(M: P.Monoid<E>): P.Applicative<[URI], V & HKT.Fix<"E", E>> {
  return HKT.instance<P.Applicative<[URI], V & HKT.Fix<"E", E>>>({
    ...getApply(M),
    pure: () => make(M.nat),
    unit: () => make(M.nat)
  });
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * @category Apply
 * @since 1.0.0
 */
export function getApply<E>(S: P.Semigroup<E>): P.Apply<[URI], V & HKT.Fix<"E", E>> {
  type CE = V & HKT.Fix<"E", E>;
  return HKT.instance<P.Apply<[URI], CE>>({
    imap_: (fa, f, _) => map_(fa, f),
    imap: (f, _) => (fa) => map_(fa, f),
    map_,
    map,
    ap_: (fab, fa) => make(S.combine_(fab, fa)),
    ap: (fa) => (fab) => make(S.combine_(fab, fa)),
    product_: (fa, fb) => make(S.combine_(fa, fb)),
    product: (fb) => (fa) => make(S.combine_(fa, fb)),
    map2_: (fa, fb, _) => make(S.combine_(fa, fb)),
    map2: (fb, _) => (fa) => make(S.combine_(fa, fb))
  });
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<E, A, D, B>(pab: Const<E, A>, f: (e: E) => D, _: (a: A) => B): Const<D, B> {
  return make(f(pab));
}

export function bimap<E, A, D, B>(
  f: (e: E) => D,
  g: (a: A) => B
): (pab: Const<E, A>) => Const<D, B> {
  return (pab) => bimap_(pab, f, g);
}

export function mapLeft_<E, A, D>(pab: Const<E, A>, f: (e: E) => D): Const<D, A> {
  return make(f(pab));
}

export function mapLeft<E, D>(f: (e: E) => D): <A>(pab: Const<E, A>) => Const<D, A> {
  return (pab) => make(f(pab));
}

/*
 * -------------------------------------------
 * Bounded
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getBounded<E, A>(B: P.Bounded<E>): P.Bounded<Const<E, A>> {
  return identity(B) as any;
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<E, A, B>(fa: Const<E, A>, _: (b: B) => A): Const<E, B> {
  return unsafeCoerce(fa);
}

export function contramap<A, B>(_: (b: B) => A): <E>(fa: Const<E, A>) => Const<E, B> {
  return unsafeCoerce;
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

/**
 * @category Eq
 * @since 1.0.0
 */
export function getEq<E, A>(E: Eq<E>): Eq<Const<E, A>> {
  return identity(E);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: Const<E, A>, _: (a: A) => B): Const<E, B> {
  return unsafeCoerce(fa);
}

export function map<A, B>(_: (a: A) => B): <E>(fa: Const<E, A>) => Const<E, B> {
  return unsafeCoerce;
}

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

/**
 * @category Monoid
 * @since 1.0.0
 */
export function getMonoid<E, A>(M: P.Monoid<E>): P.Monoid<Const<E, A>> {
  return identity(M) as any;
}

/*
 * -------------------------------------------
 * Ord
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getOrd<E, A>(O: P.Ord<E>): P.Ord<Const<E, A>> {
  return identity(O) as any;
}

/*
 * -------------------------------------------
 * Ring
 * -------------------------------------------
 */

/**
 * @category Ring
 * @since 1.0.0
 */
export function getRing<E, A>(S: P.Ring<E>): P.Ring<Const<E, A>> {
  return identity(S) as any;
}

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

/**
 * @category Semigroup
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<E>): P.Semigroup<Const<E, A>> {
  return identity(S) as any;
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

/**
 * @category Show
 * @since 1.0.0
 */
export function getShow<E, A>(S: Show<E>): Show<Const<E, A>> {
  return {
    show: (c) => `Const(${S.show(c)})`
  };
}
