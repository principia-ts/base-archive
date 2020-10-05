import { bind_, flow } from "@principia/core/Function";
import * as TC from "@principia/core/typeclass-index";

import * as M from "./core";
import type { URI, V } from "./Managed";
import { InferSuccess } from "./Managed";

export const pure: TC.PureF<[URI], V> = M.succeed;

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const bind: TC.BindF<[URI], V> = (fa) => (f) => M._chain(fa, f);

export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) =>
   M._chain(fa, (a) => M._map(fab, (ab) => ab(a)));

export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) =>
   M._chain(fa, (a) => M._map(fb, () => a));

export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => M._chain(fa, () => fb);

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const _tap: TC.UC_TapF<[URI], V> = (ma, f) => M.tap(f)(ma);

export const _alt: TC.UC_AltF<[URI], V> = (fa, that) => M._chain(fa, () => that());

export const alt: TC.AltF<[URI], V> = (that) => (fa) => _alt(fa, that);

export const apS: TC.ApSF<[URI], V> = (name, fb) =>
   flow(
      M.map((a) => (b: InferSuccess<typeof fb>) => bind_(a, name, b)),
      ap(fb)
   );
