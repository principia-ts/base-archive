import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import { getLeft, getRight } from "./combinators";
import { none } from "./constructors";
import { map_ } from "./functor";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";
import { flatten } from "./monad";

/*
 * -------------------------------------------
 * Compactable Option
 * -------------------------------------------
 */

export const separate = <A, B>(fa: Option<Either<A, B>>): Separated<Option<A>, Option<B>> => {
   const o = map_(fa, (e) => ({
      left: getLeft(e),
      right: getRight(e)
   }));
   return isNone(o) ? { left: none(), right: none() } : o.value;
};

export const compact: <A>(ta: Option<Option<A>>) => Option<A> = flatten;

export const Compactable: P.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});
