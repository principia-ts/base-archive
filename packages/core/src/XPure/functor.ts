import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { succeed } from "./constructors";
import type { URI, V, XPure } from "./model";
import { ChainInstruction } from "./model";

/**
 * @internal
 */
const chain_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> => new ChainInstruction(ma, f);

/*
 * -------------------------------------------
 * Functor XPure
 * -------------------------------------------
 */

export function map_<S1, S2, R, E, A, B>(fa: XPure<S1, S2, R, E, A>, f: (a: A) => B): XPure<S1, S2, R, E, B> {
   return chain_(fa, (a) => succeed(f(a)));
}

export function map<A, B>(f: (a: A) => B): <S1, S2, R, E>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S2, R, E, B> {
   return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_,
   map
});
