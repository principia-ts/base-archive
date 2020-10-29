import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../XPure";
import type { EIO, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor EIO
 * -------------------------------------------
 */

export const map_: <E, A, B>(fa: EIO<E, A>, f: (a: A) => B) => EIO<E, B> = X.map_;

export const map: <A, B>(f: (a: A) => B) => <E>(fa: EIO<E, A>) => EIO<E, B> = X.map;

/**
 * @category Functor
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});
