import type { Show } from "@principia/prelude/Show";
import { fromShow } from "@principia/prelude/Show";

import { collect_ } from "./combinators";
import type { ReadonlyRecord } from "./model";

/*
 * -------------------------------------------
 * Show Record
 * -------------------------------------------
 */

export const getShow = <A>(S: Show<A>): Show<ReadonlyRecord<string, A>> =>
   fromShow((a) => {
      const elements = collect_(a, (k, a) => `${JSON.stringify(k)}: ${S.show(a)}`).join(", ");
      return elements === "" ? "{}" : `{ ${elements} }`;
   });
