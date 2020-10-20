import type { Monoid, SequenceFn, TraverseFn, TraverseFn_ } from "@principia/prelude";
import { apF_, implementTraverse_ } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as A from "../Array";
import { identity } from "../Function";
import type { Forest, Tree, URI, V } from "./model";

export const pure = <A>(a: A): Tree<A> => ({
   value: a,
   forest: A.empty()
});

export const map_ = <A, B>(fa: Tree<A>, f: (a: A) => B): Tree<B> => ({
   value: f(fa.value),
   forest: A.map_(fa.forest, (a) => map_(a, f))
});

export const map = <A, B>(f: (a: A) => B) => (fa: Tree<A>): Tree<B> => map_(fa, f);

export const both_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<readonly [A, B]> => ({
   value: [fa.value, fb.value],
   forest: A.comprehension([fa.forest, fb.forest], (a, b) => both_(a, b))
});

export const both = <B>(fb: Tree<B>) => <A>(fa: Tree<A>): Tree<readonly [A, B]> => both_(fa, fb);

export const mapBoth_ = <A, B, C>(fa: Tree<A>, fb: Tree<B>, f: (a: A, b: B) => C): Tree<C> => ({
   value: f(fa.value, fb.value),
   forest: A.comprehension([fa.forest, fb.forest], (a, b) => mapBoth_(a, b, f))
});

export const mapBoth = <A, B, C>(fb: Tree<B>, f: (a: A, b: B) => C) => (fa: Tree<A>): Tree<C> => mapBoth_(fa, fb, f);

export const ap_ = <A, B>(fab: Tree<(a: A) => B>, fa: Tree<A>): Tree<B> => chain_(fab, (f) => map_(fa, (a) => f(a)));

export const ap = <A>(fa: Tree<A>) => <B>(fab: Tree<(a: A) => B>): Tree<B> => ap_(fab, fa);

export const apFirst_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<A> => mapBoth_(fa, fb, (a, _) => a);

export const apFirst = <B>(fb: Tree<B>) => <A>(fa: Tree<A>): Tree<A> => apFirst_(fa, fb);

export const apSecond_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<B> => mapBoth_(fa, fb, (_, b) => b);

export const chain_ = <A, B>(ma: Tree<A>, f: (a: A) => Tree<B>): Tree<B> => {
   const { value, forest } = f(ma.value);
   const combine = A.getMonoid<Tree<B>>().combine_;
   return {
      value,
      forest: combine(
         forest,
         A.map_(ma.forest, (a) => chain_(a, f))
      )
   };
};

export const chain = <A, B>(f: (a: A) => Tree<B>) => (ma: Tree<A>): Tree<B> => chain_(ma, f);

export const flatten: <A>(mma: Tree<Tree<A>>) => Tree<A> = chain(identity);

export const tap_ = <A, B>(ma: Tree<A>, f: (a: A) => Tree<B>): Tree<A> => chain_(ma, (a) => map_(f(a), () => a));

export const tap = <A, B>(f: (a: A) => Tree<B>) => (ma: Tree<A>): Tree<A> => tap_(ma, f);

export const reduce_ = <A, B>(fa: Tree<A>, b: B, f: (b: B, a: A) => B): B => {
   let r: B = f(b, fa.value);
   const len = fa.forest.length;
   for (let i = 0; i < len; i++) {
      r = reduce_(fa.forest[i], r, f);
   }
   return r;
};

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Tree<A>): B => reduce_(fa, b, f);

export const reduceRight_ = <A, B>(fa: Tree<A>, b: B, f: (a: A, b: B) => B): B => {
   let r: B = b;
   const len = fa.forest.length;
   for (let i = len - 1; i >= 0; i--) {
      r = reduceRight_(fa.forest[i], r, f);
   }
   return f(fa.value, r);
};

export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Tree<A>): B => reduceRight_(fa, b, f);

export const foldMap_ = <M>(M: Monoid<M>) => <A>(fa: Tree<A>, f: (a: A) => M): M =>
   reduce_(fa, M.nat, (acc, a) => M.combine_(acc, f(a)));

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Tree<A>) => foldMap_(M)(fa, f);

export const traverse_: TraverseFn_<[URI], V> = implementTraverse_<[URI], V>()((_) => (G) => {
   const traverseG = A.traverse_(G);
   const out = <A, B>(ta: Tree<A>, f: (a: A) => HKT.HKT<typeof _.G, B>): HKT.HKT<typeof _.G, Tree<B>> =>
      apF_(G)(
         G.map_(f(ta.value), (value) => (forest: Forest<B>) => ({
            value,
            forest
         })),
         traverseG(ta.forest, (a) => out(a, f))
      );
   return out;
});

export const traverse: TraverseFn<[URI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f);

export const sequence: SequenceFn<[URI], V> = (G) => (ta) => traverse_(G)(ta, identity);

export const extend_ = <A, B>(wa: Tree<A>, f: (wa: Tree<A>) => B): Tree<B> => ({
   value: f(wa),
   forest: A.map_(wa.forest, (a) => extend_(a, f))
});

export const extend = <A, B>(f: (wa: Tree<A>) => B) => (wa: Tree<A>): Tree<B> => extend_(wa, f);

export const duplicate: <A>(wa: Tree<A>) => Tree<Tree<A>> = extend(identity);

export const extract = <A>(wa: Tree<A>): A => wa.value;
