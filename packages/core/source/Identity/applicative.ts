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

export const both_: <A, B>(fa: A, fb: B) => readonly [A, B] = tuple;

export const both = <B>(fb: B) => <A>(fa: A): readonly [A, B] => both_(fa, fb);

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});
