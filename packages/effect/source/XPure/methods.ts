import { identity, tuple } from "@principia/core/Function";
import type * as TC from "@principia/core/typeclass-index";

import { succeed } from "./constructors";
import { AccessInstruction, ChainInstruction, ProvideInstruction } from "./instructions";
import type { URI, V, XPure } from "./XPure";

export const chain_: TC.X.UC_ChainF<[URI], V> = (ma, f) => new ChainInstruction(ma, f);

export const chain: TC.X.ChainF<[URI], V> = (f) => (ma) => chain_(ma, f);

export const map_: TC.UC_MapF<[URI], V> = (fa, f) => chain_(fa, (a) => succeed(f(a)));

export const map: TC.MapF<[URI], V> = (f) => (fa) => map_(fa, f);

export const tap_: TC.X.UC_TapF<[URI], V> = (ma, f) => chain_(ma, (a) => map_(f(a), () => a));

export const tap: TC.X.TapF<[URI], V> = (f) => (ma) => tap_(ma, f);

export const pure = <A>(a: A): XPure<unknown, never, unknown, never, A> => succeed(a);

export const mapBoth_ = <S1, S2, R, E, A, S3, Q, D, B, C>(
   fa: XPure<S1, S2, R, E, A>,
   fb: XPure<S2, S3, Q, D, B>,
   f: (a: A, b: B) => C
): XPure<S1, S3, Q & R, D | E, C> => chain_(fa, (a) => map_(fb, (b) => f(a, b)));

export const mapBoth = <A, S2, S3, Q, D, B, C>(fb: XPure<S2, S3, Q, D, B>, f: (a: A, b: B) => C) => <S1, R, E>(
   fa: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, C> => mapBoth_(fa, fb, f);

export const both_ = <S1, S2, R, E, A, S3, Q, D, B>(
   fa: XPure<S1, S2, R, E, A>,
   fb: XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, readonly [A, B]> => mapBoth_(fa, fb, tuple);

export const both = <S2, S3, Q, D, B>(fb: XPure<S2, S3, Q, D, B>) => <S1, R, E, A>(
   fa: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, readonly [A, B]> => both_(fa, fb);

export const flatten: TC.X.FlattenF<[URI], V> = (mma) => chain_(mma, identity);

export const ask = <R>(): XPure<unknown, never, R, never, R> => new AccessInstruction((r: R) => succeed(r));

export const asksM: TC.AccessMF<[URI], V> = (f) => new AccessInstruction(f);

export const asks: TC.AccessF<[URI], V> = (f) => asksM((r: Parameters<typeof f>[0]) => succeed(f(r)));

export const giveAll_: TC.UC_ProvideAllF<[URI], V> = (fa, r) => new ProvideInstruction(fa, r);

export const giveAll: TC.ProvideAllF<[URI], V> = (r) => (fa) => giveAll_(fa, r);

export const local_: TC.UC_ProvideSomeF<[URI], V> = (ma, f) =>
   asksM((r: Parameters<typeof f>[0]) => giveAll_(ma, f(r)));

export const local: TC.ProvideSomeF<[URI], V> = (f) => (ma) => local_(ma, f);

export const give_: TC.UC_ProvideF<[URI], V> = (ma, r) => local_(ma, (r0) => ({ ...r, ...r0 }));

export const give: TC.ProvideF<[URI], V> = (r) => (ma) => give_(ma, r);
