import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../SIO";
import { Functor } from "./functor";
import type { EIO, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative EIO
 * -------------------------------------------
 */

export const zip_: <E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>) => EIO<E | G, readonly [A, B]> =
  X.zip_;

export const zip: <G, B>(fb: EIO<G, B>) => <E, A>(fa: EIO<E, A>) => EIO<E | G, readonly [A, B]> =
  X.zip;

export const pure: <E = never, A = never>(a: A) => EIO<E, A> = X.pure;

/**
 * @category Applicative
 * @since 1.0.0
 */
export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});
