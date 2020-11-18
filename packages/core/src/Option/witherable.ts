import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { flow } from "../Function";
import { getLeft, getRight } from "./combinators";
import { none } from "./constructors";
import { map_ } from "./functor";
import { isNone } from "./guards";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Witherable Option
 * -------------------------------------------
 */

export const wither_: P.WitherFn_<[URI], V> = (A) => (wa, f) =>
  isNone(wa) ? A.map_(A.unit(), () => none()) : f(wa.value);

export const wither: P.WitherFn<[URI], V> = (A) => (f) => (wa) => wither_(A)(wa, f);

export const wilt_: P.WiltFn_<[URI], V> = (A) => (wa, f) => {
  const o = map_(
    wa,
    flow(
      f,
      A.map((e) => ({
        left: getLeft(e),
        right: getRight(e)
      }))
    )
  );
  return isNone(o)
    ? A.map_(A.unit(), () => ({
        left: none(),
        right: none()
      }))
    : o.value;
};

export const wilt: P.WiltFn<[URI], V> = (A) => (f) => (wa) => wilt_(A)(wa, f);

export const Witherable: P.Witherable<[URI], V> = HKT.instance({
  wilt_,
  wither_,
  wilt,
  wither
});
