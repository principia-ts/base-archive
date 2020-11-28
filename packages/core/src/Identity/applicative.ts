import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { tuple } from "../Function";
import { Functor } from "./functor";
import type { URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Identity
 * -------------------------------------------
 */

export const zip_: <A, B>(fa: A, fb: B) => readonly [A, B] = tuple;

export const zip = <B>(fb: B) => <A>(fa: A): readonly [A, B] => zip_(fa, fb);

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});
