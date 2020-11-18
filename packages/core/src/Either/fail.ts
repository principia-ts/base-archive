import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { left } from "./constructors";
import type { URI, V } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Fail Either
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const Fail: P.Fail<[URI], V> = HKT.instance({
  fail: left
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadFail: P.MonadFail<[URI], V> = HKT.instance({
  ...Monad,
  ...Fail
});
