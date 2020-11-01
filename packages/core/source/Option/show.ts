import type { Show } from "@principia/prelude/Show";
import { fromShow } from "@principia/prelude/Show";

import { isNone } from "./guards";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Show Option
 * -------------------------------------------
 */

export const getShow = <A>(S: Show<A>): Show<Option<A>> =>
   fromShow((a) => (isNone(a) ? "None" : `Some<${S.show(a.value)}>`));
