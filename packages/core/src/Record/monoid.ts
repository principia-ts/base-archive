import type * as TC from "@principia/prelude";
import { makeMonoid } from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";
import * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { empty } from "./constructors";
import { isSubrecord } from "./guards";
import type { ReadonlyRecord } from "./model";

const _hasOwnProperty = Object.prototype.hasOwnProperty;

/*
 * -------------------------------------------
 * Monoid Record
 * -------------------------------------------
 */

export function getMonoid<N extends string, A>(S: TC.Semigroup<A>): TC.Monoid<ReadonlyRecord<N, A>>;
export function getMonoid<A>(S: TC.Semigroup<A>): TC.Monoid<ReadonlyRecord<string, A>>;
export function getMonoid<A>(S: TC.Semigroup<A>): TC.Monoid<ReadonlyRecord<string, A>> {
  return makeMonoid<ReadonlyRecord<string, A>>((x, y) => {
    if (x === empty) {
      return y;
    }
    if (y === empty) {
      return x;
    }
    const keys = Object.keys(y);
    const len = keys.length;
    if (len === 0) {
      return x;
    }
    const r: Record<string, A> = Object.assign({}, x);
    for (let i = 0; i < len; i++) {
      const k = keys[i];
      r[k] = _hasOwnProperty.call(x, k) ? S.combine_(x[k], y[k]) : y[k];
    }
    return r;
  }, empty);
}
