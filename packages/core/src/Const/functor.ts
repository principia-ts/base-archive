import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { unsafeCoerce } from "../Function";
import type { Const, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Const
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: Const<E, A>, _: (a: A) => B): Const<E, B> {
   return unsafeCoerce(fa);
}

export function map<A, B>(_: (a: A) => B): <E>(fa: Const<E, A>) => Const<E, B> {
   return unsafeCoerce;
}

/**
 * @category Functor
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});
