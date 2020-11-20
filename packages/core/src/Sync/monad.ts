import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import * as X from "../XPure";
import { fail } from "./constructors";
import { Functor } from "./functor";
import type { Sync, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Sync
 * -------------------------------------------
 */

export const chain_: <R, E, A, Q, D, B>(
  ma: Sync<R, E, A>,
  f: (a: A) => Sync<Q, D, B>
) => Sync<Q & R, D | E, B> = X.chain_;

export const chain: <A, Q, D, B>(
  f: (a: A) => Sync<Q, D, B>
) => <R, E>(ma: Sync<R, E, A>) => Sync<Q & R, D | E, B> = X.chain;

export const flatten: <R, E, R1, E1, A>(
  mma: Sync<R, E, Sync<R1, E1, A>>
) => Sync<R & R1, E | E1, A> = chain(identity);

export const tap_: <R, E, A, Q, D, B>(
  ma: Sync<R, E, A>,
  f: (a: A) => Sync<Q, D, B>
) => Sync<Q & R, D | E, A> = X.tap_;

export const tap: <A, Q, D, B>(
  f: (a: A) => Sync<Q, D, B>
) => <R, E>(ma: Sync<R, E, A>) => Sync<Q & R, D | E, A> = X.tap;

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  unit,
  flatten
});

export const MonadFail: P.MonadFail<[URI], V> = HKT.instance({
  ...Monad,
  fail
});
