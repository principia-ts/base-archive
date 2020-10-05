import type * as HKT from "../HKT";
import * as Mb from "../Maybe";
import { Unfoldable } from "../typeclass-index";
import { _collect } from "./combinators";
import { ReadonlyRecord } from "./Record";

/**
 * @category Destructors
 * @since 1.0.0
 */
export const toArray = <N extends string, A>(
   r: ReadonlyRecord<N, A>
): ReadonlyArray<readonly [N, A]> => _collect(r, (k, a) => [k, a]);

/**
 * Unfolds a record into a list of key/value pairs
 *
 * @category Destructors
 * @since 1.0.0
 */
export const toUnfoldable = <F extends HKT.URIS, C = HKT.Auto>(U: Unfoldable<F, C>) => <
   N extends string,
   A
>(
   r: ReadonlyRecord<N, A>
): HKT.Kind<
   F,
   C,
   HKT.Initial<C, "N">,
   HKT.Initial<C, "K">,
   HKT.Initial<C, "Q">,
   HKT.Initial<C, "W">,
   HKT.Initial<C, "X">,
   HKT.Initial<C, "I">,
   HKT.Initial<C, "S">,
   HKT.Initial<C, "R">,
   HKT.Initial<C, "E">,
   readonly [N, A]
> => {
   const arr = toArray(r);
   const len = arr.length;
   return U.unfold(0, (b) => (b < len ? Mb.just([arr[b], b + 1]) : Mb.nothing()));
};
