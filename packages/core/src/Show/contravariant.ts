import type { Show } from "@principia/prelude/Show";
import { fromShow } from "@principia/prelude/Show";

/*
 * -------------------------------------------
 * Contravariant Show
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: Show<A>, f: (b: B) => A): Show<B> {
   return fromShow((b) => fa.show(f(b)));
}

export function contramap<A, B>(f: (b: B) => A): (fa: Show<A>) => Show<B> {
   return (fa) => contramap_(fa, f);
}
