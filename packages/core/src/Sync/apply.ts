import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../SIO";
import { Functor, map_ } from "./functor";
import type { Sync, URI, USync, V } from "./model";

/*
 * -------------------------------------------
 * Apply Sync
 * -------------------------------------------
 */

export const zipWith_: <R, E, A, Q, D, B, C>(
  fa: Sync<R, E, A>,
  fb: Sync<Q, D, B>,
  f: (a: A, b: B) => C
) => Sync<Q & R, D | E, C> = X.zipWith_;

export const zipWith: <A, Q, D, B, C>(
  fb: Sync<Q, D, B>,
  f: (a: A, b: B) => C
) => <R, E>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, C> = X.zipWith;

export const ap_: <R, E, A, Q, D, B>(
  fab: Sync<R, E, (a: A) => B>,
  fa: Sync<Q, D, A>
) => Sync<Q & R, D | E, B> = X.ap_;

export const ap: <Q, D, A>(
  fa: Sync<Q, D, A>
) => <R, E, B>(fab: Sync<R, E, (a: A) => B>) => Sync<Q & R, D | E, B> = X.ap;

export const apFirst_: <R, E, A, R1, E1, B>(
  fa: Sync<R, E, A>,
  fb: Sync<R1, E1, B>
) => Sync<R & R1, E | E1, A> = X.apFirst_;

export const apFirst: <R1, E1, B>(
  fb: Sync<R1, E1, B>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, A> = X.apFirst;

export const apSecond_: <R, E, A, R1, E1, B>(
  fa: Sync<R, E, A>,
  fb: Sync<R1, E1, B>
) => Sync<R & R1, E | E1, B> = X.apSecond_;

export const apSecond: <R1, E1, B>(
  fb: Sync<R1, E1, B>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, B> = X.apSecond;

export function liftA2_<A, B, C>(f: (a: A, b: B) => C): (a: USync<A>, b: USync<B>) => USync<C> {
  return (a, b) => zipWith_(a, b, f);
}

export function liftA2<A, B, C>(
  f: (a: A) => (b: B) => C
): (a: USync<A>) => (b: USync<B>) => USync<C> {
  return (a) => (b) => zipWith_(a, b, (a, b) => f(a)(b));
}

export function liftK<A extends [unknown, ...ReadonlyArray<unknown>], B>(
  f: (...args: A) => B
): (...args: { [K in keyof A]: USync<A[K]> }) => USync<B> {
  return (...args) => map_(tuple(...(args as any)), (a) => f(...(a as any))) as any;
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  zipWith_,
  zipWith
});

export const tuple = P.tupleF(Apply);

export const struct = P.structF(Apply);
