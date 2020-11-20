import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../XPure";
import { Functor } from "./functor";
import type { Sync, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Sync
 * -------------------------------------------
 */

export const both_: <R, E, A, Q, D, B>(
  fa: Sync<R, E, A>,
  fb: Sync<Q, D, B>
) => Sync<Q & R, D | E, readonly [A, B]> = X.both_;

export const both: <Q, D, B>(
  fb: Sync<Q, D, B>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, readonly [A, B]> = X.both;

export const pure: <A>(a: A) => Sync<unknown, never, A> = X.pure;

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  both_,
  both,
  unit
});
