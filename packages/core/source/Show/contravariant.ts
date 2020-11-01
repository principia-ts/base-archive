import type { Show } from "@principia/prelude/Show";
import { fromShow } from "@principia/prelude/Show";

/*
 * -------------------------------------------
 * Contravariant Show
 * -------------------------------------------
 */

export const contramap_ = <A, B>(fa: Show<A>, f: (b: B) => A): Show<B> => fromShow((b) => fa.show(f(b)));

export const contramap = <A, B>(f: (b: B) => A) => (fa: Show<A>): Show<B> => contramap_(fa, f);
