import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor } from "./functor";
import type { EIO, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Alt EIO
 * -------------------------------------------
 */

export const alt_ = <E, A, G>(fa: EIO<E, A>, that: () => EIO<G, A>): EIO<E | G, A> => chain_(fa, that);

export const alt = <A, G>(that: () => EIO<G, A>) => <E>(fa: EIO<E, A>): EIO<E | G, A> => alt_(fa, that);

/**
 * @category Alt
 * @since 1.0.0
 */
export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});
