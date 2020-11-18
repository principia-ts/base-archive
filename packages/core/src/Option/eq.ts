import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { isNone } from "./guards";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Eq Option
 * -------------------------------------------
 */

export function getEq<A>(E: Eq<A>): Eq<Option<A>> {
  return fromEquals((x, y) =>
    x === y || isNone(x) ? isNone(y) : isNone(y) ? false : E.equals_(x.value, y.value)
  );
}
