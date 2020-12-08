import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Alt Identity
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export const alt_: <A>(fa: A, that: () => A) => A = identity;

/**
 * @optimize identity
 */
export const alt = <A>(that: () => A) => (fa: A): A => alt_(fa, that);

export const Alt: P.Alt<[URI], V> = HKT.instance({
  ...Functor,
  alt_,
  alt
});
