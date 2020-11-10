import { fromEquals } from "@principia/prelude/Eq";

import type { Eq } from "./model";

/*
 * -------------------------------------------
 * Contravariant Eq
 * -------------------------------------------
 */

export const contramap_ = <A, B>(fa: Eq<A>, f: (b: B) => A): Eq<B> => fromEquals((x, y) => fa.equals_(f(x), f(y)));

export const contramap = <A, B>(f: (b: B) => A) => (fa: Eq<A>): Eq<B> => contramap_(fa, f);
