import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor, map_ } from "./functor";
import type { URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Identity
 * -------------------------------------------
 */

export const chain_ = <A, B>(ma: A, f: (a: A) => B): B => f(ma);

export const chain = <A, B>(f: (a: A) => B) => (ma: A): B => f(ma);

export const tap_ = <A, B>(ma: A, f: (a: A) => B): A => chain_(ma, (a) => map_(f(a), () => a));

export const tap = <A, B>(f: (a: A) => B) => (ma: A): A => tap_(ma, f);

export const flatten = <A>(mma: A): A => chain_(mma, identity);

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});
