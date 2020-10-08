import { identity, pipe } from "../Function";
import type { Monoid } from "../Monoid";
import * as TC from "../typeclass-index";
import type { Identity, URI, V } from "./Identity";

/*
 * -------------------------------------------
 * Identity Methods
 * -------------------------------------------
 */

export const unit = (): void => undefined;

export const pure: <A>(a: A) => A = identity;

export const map_ = <A, B>(fa: A, f: (a: A) => B) => f(fa);

export const map = <A, B>(f: (a: A) => B) => (fa: A): B => f(fa);

export const chain_ = <A, B>(ma: A, f: (a: A) => B): B => f(ma);

export const chain = <A, B>(f: (a: A) => B) => (ma: A): B => f(ma);

export const tap_ = <A, B>(ma: A, f: (a: A) => B): A => chain_(ma, (a) => map_(f(a), () => a));

export const tap = <A, B>(f: (a: A) => B) => (ma: A): A => tap_(ma, f);

export const flatten = <A>(mma: A): A => chain_(mma, identity);

export const ap_ = <A, B>(fab: (a: A) => B, fa: A): B => fab(fa);

export const ap = <A>(fa: A) => <B>(fab: (a: A) => B): B => fab(fa);

export const apFirst_ = <A, B>(fa: A, fb: B): A =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <B>(fb: B) => <A>(fa: A): A => apFirst_(fa, fb);

export const apSecond_ = <A, B>(fa: A, fb: B) =>
   ap_(
      map_(fa, (_) => (b: B) => b),
      fb
   );

export const apSecond = <B>(fb: B) => <A>(fa: A): B => apSecond_(fa, fb);

export const mapBoth_ = <A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C => f(fa, fb);

export const mapBoth = <A, B, C>(fb: B, f: (a: A, b: B) => C) => (fa: A): C => f(fa, fb);

export const reduce_ = <A, B>(fa: A, b: B, f: (b: B, a: A) => B): B => f(b, fa);

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: A): B => f(b, fa);

export const foldMap_ = <M>(_: Monoid<M>) => <A>(fa: A, f: (a: A) => M) => f(fa);

export const foldMap = <M>(_: Monoid<M>) => <A>(f: (a: A) => M) => (fa: A): M => f(fa);

export const reduceRight_ = <A, B>(fa: A, b: B, f: (a: A, b: B) => B): B => f(fa, b);

export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: A): B => f(fa, b);

export const extend_ = <A, B>(wa: A, f: (wa: A) => B): B => f(wa);

export const extend = <A, B>(f: (wa: A) => B) => (wa: A): B => f(wa);

export const extract: <A>(wa: A) => A = identity;

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(identity);

export const traverse_: TC.UC_TraverseF<[URI], V> = TC.implementUCTraverse<[URI], V>()((_) => (G) => (ta, f) =>
   pipe(f(ta), G.map(identity))
);

export const traverse: TC.TraverseF<[URI], V> = (G) => {
   const traverseG_ = traverse_(G);
   return (f) => (ta) => traverseG_(ta, f);
};

export const sequence: TC.SequenceF<[URI], V> = (G) => (ta) => pipe(ta, G.map(identity));

export const alt_: <A>(fa: A, that: () => A) => A = identity;

export const alt = <A>(that: () => A) => (fa: A): A => alt_(fa, that);
