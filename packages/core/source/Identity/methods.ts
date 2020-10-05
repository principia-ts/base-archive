import { identity, pipe } from "../Function";
import * as TC from "../typeclass-index";
import type { Identity, URI, V } from "./Identity";

/*
 * -------------------------------------------
 * Identity Methods
 * -------------------------------------------
 */

export const any: TC.AnyF<[URI], V> = () => ({} as any);

export const pure: TC.PureF<[URI], V> = identity;

export const _map: TC.UC_MapF<[URI], V> = (fa, f) => f(fa);

export const map: TC.MapF<[URI], V> = (f) => (fa) => f(fa);

export const _chain: TC.UC_ChainF<[URI], V> = (ma, f) => f(ma);

export const chain: TC.ChainF<[URI], V> = (f) => (ma) => f(ma);

export const _tap: TC.UC_TapF<[URI], V> = (ma, f) => _chain(ma, (a) => _map(f(a), () => a));

export const tap: TC.TapF<[URI], V> = (f) => (ma) => _tap(ma, f);

export const flatten: TC.FlattenF<[URI], V> = (ffa) => _chain(ffa, identity);

export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) => fab(fa);

export const ap: TC.ApF<[URI], V> = (fa) => (fab) => fab(fa);

export const _apFirst: TC.UC_ApFirstF<[URI], V> = (fa, fb) =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

export const _apSecond: TC.UC_ApSecondF<[URI], V> = <A, B>(fa: A, fb: B) =>
   _ap(
      _map(fa, (_) => (b: B) => b),
      fb
   );

export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);

export const _mapBoth: TC.UC_MapBothF<[URI], V> = (fa, fb, f) => f(fa, fb);

export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => f(fa, fb);

export const _reduce: TC.UC_ReduceF<[URI], V> = (fa, b, f) => f(b, fa);

export const reduce: TC.ReduceF<[URI], V> = (b, f) => (fa) => f(b, fa);

export const _foldMap: TC.UC_FoldMapF<[URI], V> = (_) => (fa, f) => f(fa);

export const foldMap: TC.FoldMapF<[URI], V> = (_) => (f) => (fa) => f(fa);

export const _reduceRight: TC.UC_ReduceRightF<[URI], V> = (fa, b, f) => f(fa, b);

export const reduceRight: TC.ReduceRightF<[URI], V> = (b, f) => (fa) => f(fa, b);

export const _extend: TC.UC_ExtendF<[URI], V> = (wa, f) => f(wa);

export const extend: TC.ExtendF<[URI], V> = (f) => (wa) => f(wa);

export const extract: TC.ExtractF<[URI], V> = identity;

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(identity);

export const _traverse: TC.UC_TraverseF<[URI], V> = TC.implementUCTraverse<
   [URI],
   V
>()((_) => (G) => (ta, f) => pipe(f(ta), G.map(identity)));

export const traverse: TC.TraverseF<[URI], V> = (G) => {
   const _traverseG = _traverse(G);
   return (f) => (ta) => _traverseG(ta, f);
};

export const sequence: TC.SequenceF<[URI], V> = (G) => (ta) => pipe(ta, G.map(identity));

export const _alt: TC.UC_AltF<[URI], V> = identity;

export const alt: TC.AltF<[URI], V> = identity;
