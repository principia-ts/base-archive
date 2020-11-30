import * as O from "../../../Option";
import * as I from "../_internal/io";
import type { Fiber } from "../model";
import { makeSynthetic } from "../model";

/**
 * A fiber that never fails or succeeds
 */
export const never: Fiber<never, never> = makeSynthetic({
  _tag: "SyntheticFiber",
  await: I.never,
  getRef: (fiberRef) => I.succeed(fiberRef.initial),
  interruptAs: () => I.never,
  inheritRefs: I.unit(),
  poll: I.succeed(O.none())
});
