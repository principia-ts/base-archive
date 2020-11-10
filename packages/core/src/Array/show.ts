import type { Show } from "@principia/prelude/Show";

/*
 * -------------------------------------------
 * Show Array
 * -------------------------------------------
 */

/**
 * @category Show
 * @since 1.0.0
 */
export const getShow = <A>(S: Show<A>): Show<ReadonlyArray<A>> => ({
   show: (as) => `[${as.map(S.show).join(", ")}]`
});
