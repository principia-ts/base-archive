import { identity, pipe } from "@principia/core/Function";
import type * as TC from "@principia/core/typeclass-index";

import { succeed } from "./constructors";
import { AccessInstruction, ChainInstruction, ProvideInstruction } from "./instructions";
import { URI, V, XPure } from "./XPure";

export const _chain: TC.X.UC_ChainF<[URI], V> = (ma, f) => new ChainInstruction(ma, f);

export const chain: TC.X.ChainF<[URI], V> = (f) => (ma) => _chain(ma, f);

export const _map: TC.UC_MapF<[URI], V> = (fa, f) => _chain(fa, (a) => succeed(f(a)));

export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

export const _tap: TC.X.UC_TapF<[URI], V> = (ma, f) => _chain(ma, (a) => _map(f(a), () => a));

export const tap: TC.X.TapF<[URI], V> = (f) => (ma) => _tap(ma, f);

export const _ap: TC.X.UC_ApF<[URI], V> = (fab, fa) => _chain(fab, (f) => _map(fa, f));

export const ap: TC.X.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

export const _apFirst: TC.X.UC_ApFirstF<[URI], V> = (fa, fb) =>
   pipe(
      fa,
      map((a) => () => a),
      ap(fb)
   );

export const apFirst: TC.X.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

export const _apSecond: TC.X.UC_ApSecondF<[URI], V> = <S1, S2, R, E, A, S3, R1, E1, B>(
   fa: XPure<S1, S2, R, E, A>,
   fb: XPure<S2, S3, R1, E1, B>
): XPure<S1, S3, R & R1, E | E1, B> =>
   pipe(
      fa,
      map(() => (b: B) => b),
      ap(fb)
   );

export const apSecond: TC.X.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);

export const _mapBoth: TC.X.UC_MapBothF<[URI], V> = (fa, fb, f) =>
   _chain(fa, (a) => _map(fb, (b) => f(a, b)));

export const mapBoth: TC.X.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

export const _both: TC.X.UC_BothF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (a, b) => [a, b]);

export const both: TC.X.BothF<[URI], V> = (fb) => (fa) => _both(fa, fb);

export const flatten: TC.X.FlattenF<[URI], V> = (mma) => _chain(mma, identity);

export const accessM: TC.AccessMF<[URI], V> = (f) => new AccessInstruction(f);

export const access: TC.AccessF<[URI], V> = (f) =>
   accessM((r: Parameters<typeof f>[0]) => succeed(f(r)));

export const _provideAll: TC.UC_ProvideAllF<[URI], V> = (fa, r) => new ProvideInstruction(fa, r);

export const provideAll: TC.ProvideAllF<[URI], V> = (r) => (fa) => _provideAll(fa, r);

export const _provideSome: TC.UC_ProvideSomeF<[URI], V> = (ma, f) =>
   accessM((r: Parameters<typeof f>[0]) => _provideAll(ma, f(r)));

export const provideSome: TC.ProvideSomeF<[URI], V> = (f) => (ma) => _provideSome(ma, f);

export const _provide: TC.UC_ProvideF<[URI], V> = (ma, r) =>
   _provideSome(ma, (r0) => ({ ...r, ...r0 }));

export const provide: TC.ProvideF<[URI], V> = (r) => (ma) => _provide(ma, r);
