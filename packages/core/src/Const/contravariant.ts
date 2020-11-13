import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { unsafeCoerce } from "../Function";
import type { Const, URI, V } from "./model";

/*
 * -------------------------------------------
 * Contravariant Const
 * -------------------------------------------
 */

export function contramap_<E, A, B>(fa: Const<E, A>, _: (b: B) => A): Const<E, B> {
   return unsafeCoerce(fa);
}

export function contramap<A, B>(_: (b: B) => A): <E>(fa: Const<E, A>) => Const<E, B> {
   return unsafeCoerce;
}

/**
 * @category Contravariant
 * @since 1.0.0
 */
export const Contravariant: P.Contravariant<[URI], V> = HKT.instance({
   contramap,
   contramap_
});
