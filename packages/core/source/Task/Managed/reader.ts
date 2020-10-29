import * as T from "./_internal/task";
import { Managed } from "./model";
import type { ReleaseMap } from "./ReleaseMap";

/**
 * Like provideSome_ for effect but for Managed
 */
export const provideSome_ = <R, E, A, R0>(self: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> =>
   new Managed(T.asksM(([r0, rm]: readonly [R0, ReleaseMap]) => T.giveAll_(self.task, [f(r0), rm])));
