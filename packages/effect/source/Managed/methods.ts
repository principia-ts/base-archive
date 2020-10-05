import { bind_, bindTo_, flow, pipe } from "@principia/core/Function";
import * as TC from "@principia/core/typeclass-index";

import * as M from "./core";
import { InferSuccess } from "./Managed";

export const pure: TC.PureF<[M.URI], M.V> = M.succeed;

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const bind: TC.BindF<[M.URI], M.V> = (fa) => (f) => M._chain(fa, f);

export const _ap: TC.UC_ApF<[M.URI], M.V> = (fab, fa) =>
   M._chain(fa, (a) => M._map(fab, (ab) => ab(a)));

export const ap: TC.ApF<[M.URI], M.V> = (fa) => (fab) => _ap(fab, fa);

export const apFirst: TC.ApFirstF<[M.URI], M.V> = (fb) => (fa) =>
   M._chain(fa, (a) => M._map(fb, () => a));

export const apSecond: TC.ApSecondF<[M.URI], M.V> = (fb) => (fa) => M._chain(fa, () => fb);

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const _tap: TC.UC_TapF<[M.URI], M.V> = (ma, f) => M.tap(f)(ma);

export const _alt: TC.UC_AltF<[M.URI], M.V> = (fa, that) => M._chain(fa, () => that());

export const alt: TC.AltF<[M.URI], M.V> = (that) => (fa) => _alt(fa, that);

export const bindS: TC.BindSF<[M.URI], M.V> = (name, f) =>
   M.chain((a) =>
      pipe(
         f(a),
         M.map((b) => bind_(a, name, b))
      )
   );

export const bindTo: TC.BindToSF<[M.URI], M.V> = (name) => (fa) => M._map(fa, bindTo_(name));

export const apS: TC.ApSF<[M.URI], M.V> = (name, fb) =>
   flow(
      M.map((a) => (b: InferSuccess<typeof fb>) => bind_(a, name, b)),
      ap(fb)
   );

export const letS: TC.LetSF<[M.URI], M.V> = (name, f) =>
   M.chain((a) =>
      pipe(
         f(a),
         M.succeed,
         M.map((b) => bind_(a, name, b))
      )
   );
