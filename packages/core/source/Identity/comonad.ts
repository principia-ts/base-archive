import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor } from "./functor";
import type { Identity, URI, V } from "./model";

/*
 * -------------------------------------------
 * Comonad Identity
 * -------------------------------------------
 */

export const extend_ = <A, B>(wa: A, f: (wa: A) => B): B => f(wa);

export const extend = <A, B>(f: (wa: A) => B) => (wa: A): B => f(wa);

export const extract: <A>(wa: A) => A = identity;

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(identity);

export const Comonad: P.Comonad<[URI], V> = HKT.instance({
   ...Functor,
   extend,
   extract
});
