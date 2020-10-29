import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { isSubrecord } from "./guards";
import type { ReadonlyRecord } from "./model";

/*
 * -------------------------------------------
 * Eq Record
 * -------------------------------------------
 */

export const getEq: {
   <N extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<N, A>>;
   <A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>>;
} = <A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> => {
   const isSubrecordE = isSubrecord(E);
   return fromEquals((x, y) => isSubrecordE(x)(y) && isSubrecordE(y)(x));
};
