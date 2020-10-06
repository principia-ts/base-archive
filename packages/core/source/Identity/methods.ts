import { identity, pipe } from "../Function";
import { Monoid } from "../Monoid";
import * as TC from "../typeclass-index";
import type { Identity, URI, V } from "./Identity";

/*
 * -------------------------------------------
 * Identity Methods
 * -------------------------------------------
 */

export const unit = (): void => undefined;

export const pure: <A>(a: A) => A = identity;

export const _map = <A, B>(fa: A, f: (a: A) => B) => f(fa);

export const map = <A, B>(f: (a: A) => B) => (fa: A): B => f(fa);

export const _chain = <A, B>(ma: A, f: (a: A) => B): B => f(ma);

export const chain = <A, B>(f: (a: A) => B) => (ma: A): B => f(ma);

export const _tap = <A, B>(ma: A, f: (a: A) => B): A => _chain(ma, (a) => _map(f(a), () => a));

export const tap = <A, B>(f: (a: A) => B) => (ma: A): A => _tap(ma, f);

export const flatten = <A>(mma: A): A => _chain(mma, identity);

export const _ap = <A, B>(fab: (a: A) => B, fa: A): B => fab(fa);

export const ap = <A>(fa: A) => <B>(fab: (a: A) => B): B => fab(fa);

export const _apFirst = <A, B>(fa: A, fb: B): A =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

export const apFirst = <B>(fb: B) => <A>(fa: A): A => _apFirst(fa, fb);

export const _apSecond = <A, B>(fa: A, fb: B) =>
   _ap(
      _map(fa, (_) => (b: B) => b),
      fb
   );

export const apSecond = <B>(fb: B) => <A>(fa: A): B => _apSecond(fa, fb);

export const _mapBoth = <A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C => f(fa, fb);

export const mapBoth = <A, B, C>(fb: B, f: (a: A, b: B) => C) => (fa: A): C => f(fa, fb);

export const _reduce = <A, B>(fa: A, b: B, f: (b: B, a: A) => B): B => f(b, fa);

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: A): B => f(b, fa);

export const _foldMap = <M>(_: Monoid<M>) => <A>(fa: A, f: (a: A) => M) => f(fa);

export const foldMap = <M>(_: Monoid<M>) => <A>(f: (a: A) => M) => (fa: A): M => f(fa);

export const _reduceRight = <A, B>(fa: A, b: B, f: (a: A, b: B) => B): B => f(fa, b);

export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: A): B => f(fa, b);

export const _extend = <A, B>(wa: A, f: (wa: A) => B): B => f(wa);

export const extend = <A, B>(f: (wa: A) => B) => (wa: A): B => f(wa);

export const extract: <A>(wa: A) => A = identity;

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(identity);

export const _traverse: TC.UC_TraverseF<[URI], V> = TC.implementUCTraverse<[URI], V>()((_) => (G) => (ta, f) =>
   pipe(f(ta), G.map(identity))
);

export const traverse: TC.TraverseF<[URI], V> = (G) => {
   const _traverseG = _traverse(G);
   return (f) => (ta) => _traverseG(ta, f);
};

export const sequence: TC.SequenceF<[URI], V> = (G) => (ta) => pipe(ta, G.map(identity));

export const _alt: <A>(fa: A, that: () => A) => A = identity;

export const alt = <A>(that: () => A) => (fa: A): A => _alt(fa, that);
