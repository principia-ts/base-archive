import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import * as X from "../XPure";
import { Functor } from "./functor";
import type { EIO, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad EIO
 * -------------------------------------------
 */

export const chain_: <E, A, G, B>(ma: EIO<E, A>, f: (a: A) => EIO<G, B>) => EIO<E | G, B> = X.chain_;

export const chain: <A, G, B>(f: (a: A) => EIO<G, B>) => <E>(ma: EIO<E, A>) => EIO<E | G, B> = X.chain;

export const tap_: <E, A, G, B>(fa: EIO<E, A>, f: (a: A) => EIO<G, B>) => EIO<E | G, A> = X.tap_;

export const tap: <A, G, B>(f: (a: A) => EIO<G, B>) => <E>(fa: EIO<E, A>) => EIO<E | G, A> = X.tap;

export function flatten<E, G, A>(mma: EIO<E, EIO<G, A>>): EIO<E | G, A> {
   return chain_(mma, identity);
}

/**
 * @category Monad
 * @since 1.0.0
 */
export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});
