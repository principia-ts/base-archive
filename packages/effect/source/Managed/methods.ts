import { bind_, flow } from "@principia/core/Function";
import type * as TC from "@principia/core/typeclass-index";

import * as M from "./core";
import type { InferSuccess, URI, V } from "./Managed";

export const pure: TC.PureF<[URI], V> = M.succeed;

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const bind: TC.BindF<[URI], V> = (fa) => (f) => M.chain_(fa, f);

export const ap_: TC.UC_ApF<[URI], V> = (fab, fa) => M.chain_(fa, (a) => M.map_(fab, (ab) => ab(a)));

export const ap: TC.ApF<[URI], V> = (fa) => (fab) => ap_(fab, fa);

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => M.chain_(fa, (a) => M.map_(fb, () => a));

export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => M.chain_(fa, () => fb);

export const alt_: TC.UC_AltF<[URI], V> = (fa, that) => M.chain_(fa, () => that());

export const alt: TC.AltF<[URI], V> = (that) => (fa) => alt_(fa, that);

export const apS: TC.ApSF<[URI], V> = (name, fb) =>
   flow(
      M.map((a) => (b: InferSuccess<typeof fb>) => bind_(a, name, b)),
      ap(fb)
   );
