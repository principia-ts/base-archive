import type { Show } from "@principia/prelude/Show";

import type { Const } from "./model";

/*
 * -------------------------------------------
 * Show Const
 * -------------------------------------------
 */

/**
 * @category Show
 * @since 1.0.0
 */
export function getShow<E, A>(S: Show<E>): Show<Const<E, A>> {
   return {
      show: (c) => `make(${S.show(c)})`
   };
}
