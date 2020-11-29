import * as O from "../../../Option";
import * as T from "../_internal/aio";
import type { Fiber } from "../model";
import { makeSynthetic } from "../model";

/**
 * A fiber that never fails or succeeds
 */
export const never: Fiber<never, never> = makeSynthetic({
  _tag: "SyntheticFiber",
  await: T.never,
  getRef: (fiberRef) => T.succeed(fiberRef.initial),
  interruptAs: () => T.never,
  inheritRefs: T.unit(),
  poll: T.succeed(O.none())
});
