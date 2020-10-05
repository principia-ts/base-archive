import { flow, identity, pipe, Predicate, PredicateWithIndex } from "../Function";
import { isJust } from "../Maybe";
import type { NonEmptyArray } from "../NonEmptyArray";
import * as TC from "../typeclass-index";
import { URI, V } from "./Array";
import { empty } from "./constructors";

const snoc = <A>(end: A) => (init: ReadonlyArray<A>): NonEmptyArray<A> => {
   const len = init.length;
   const r = Array(len + 1);
   for (let i = 0; i < len; i++) {
      r[i] = init[i];
   }
   r[len] = end;
   return (r as unknown) as NonEmptyArray<A>;
};

const _append = <A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> => {
   const lenx = xs.length;
   if (lenx === 0) {
      return ys;
   }
   const leny = ys.length;
   if (leny === 0) {
      return xs;
   }
   const r = Array(lenx + leny);
   for (let i = 0; i < lenx; i++) {
      r[i] = xs[i];
   }
   for (let i = 0; i < leny; i++) {
      r[i + lenx] = ys[i];
   }
   return r;
};

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

/**
 * pure :: a -> Array a
 *
 * Lifts a value into an Array
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: TC.PureF<[URI], V> = (a) => [a];

/**
 * none :: () -> Array ()
 *
 * @category Applicative
 * @since 1.0.0
 */
export const none: TC.NoneF<[URI], V> = () => empty;

export const any: TC.AnyF<[URI], V> = () => empty;

export const _mapWithIndex: TC.UC_MapWithIndexF<[URI], V> = (fa, f) => {
   const len = fa.length;
   const bs = new Array(len);
   for (let i = 0; i < len; i++) {
      bs[i] = f(i, fa[i]);
   }
   return bs;
};

export const _mapBoth: TC.UC_MapBothF<[URI], V> = (fa, fb, f) => {
   const fc = [];
   const len = Math.min(fa.length, fb.length);
   for (let i = 0; i < len; i++) {
      fc[i] = f(fa[i], fb[i]);
   }
   return fc;
};

export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

export const both: TC.BothF<[URI], V> = (fb) => (fa) => _mapBoth(fa, fb, (a, b) => [a, b]);

export const _both: TC.UC_BothF<[URI], V> = (fa, fb) => _both(fa, fb);

/**
 * mapWithIndex :: (FunctorWithIndex fs, Index i) => ((i, a) -> b) -> fs a -> fs b
 */
export const mapWithIndex: TC.MapWithIndexF<[URI], V> = (f) => (fa) => _mapWithIndex(fa, f);

export const _map: TC.UC_MapF<[URI], V> = (fa, f) => _mapWithIndex(fa, (_, a) => f(a));

/**
 * map :: Functor f => (a -> b) -> f a -> f b
 */
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

export const _chainWithIndex: <A, B>(
   fa: ReadonlyArray<A>,
   f: (i: number, a: A) => ReadonlyArray<B>
) => ReadonlyArray<B> = (fa, f) => {
   let outLen = 0;
   const len = fa.length;
   const temp = new Array(len);
   for (let i = 0; i < len; i++) {
      const e = fa[i];
      const arr = f(i, e);
      outLen += arr.length;
      temp[i] = arr;
   }
   const out = Array(outLen);
   let start = 0;
   for (let i = 0; i < len; i++) {
      const arr = temp[i];
      const l = arr.length;
      for (let j = 0; j < l; j++) {
         out[j + start] = arr[j];
      }
      start += l;
   }
   return out;
};

export const chainWithIdex: <A, B>(
   f: (i: number, a: A) => ReadonlyArray<B>
) => (fa: ReadonlyArray<A>) => ReadonlyArray<B> = (f) => (fa) => _chainWithIndex(fa, f);

export const _chain: TC.UC_ChainF<[URI], V> = (fa, f) => _chainWithIndex(fa, (_, a) => f(a));

/**
 * chain :: Monad m => (a -> b) -> m a -> m b
 */
export const chain: TC.ChainF<[URI], V> = (f) => (fa) => _chain(fa, f);

/**
 * bind :: Monad m => m a -> (a -> m b) -> m b
 */
export const bind: TC.BindF<[URI], V> = (fa) => (f) => _chain(fa, f);

export const _filterWithIndex: TC.UC_FilterWithIndexF<[URI], V> = <A>(
   fa: ReadonlyArray<A>,
   f: PredicateWithIndex<number, A>
) => {
   const result: Array<A> = [];
   for (let i = 0; i < fa.length; i++) {
      const a = fa[i];
      if (f(i, a)) {
         result.push(a);
      }
   }
   return result;
};

export const filterWithIndex: TC.FilterWithIndexF<[URI], V> = <A>(
   f: PredicateWithIndex<number, A>
) => (fa: ReadonlyArray<A>) => _filterWithIndex(fa, f);

export const _filter: TC.UC_FilterF<[URI], V> = <A>(fa: ReadonlyArray<A>, f: Predicate<A>) =>
   _filterWithIndex(fa, (_, a) => f(a));

/**
 * filter :: Filterable f => (a -> Boolean) -> f a -> f a
 */
export const filter: TC.FilterF<[URI], V> = <A>(f: Predicate<A>) => (fa: ReadonlyArray<A>) =>
   _filterWithIndex(fa, (_, a) => f(a));

export const _mapMaybeWithIndex: TC.UC_MapMaybeWithIndexF<[URI], V> = (fa, f) => {
   const result = [];
   for (let i = 0; i < fa.length; i++) {
      const maybeB = f(i, fa[i]);
      if (isJust(maybeB)) {
         result.push(maybeB.value);
      }
   }
   return result;
};

export const mapMaybeWithIndex: TC.MapMaybeWithIndexF<[URI], V> = (f) => (fa) =>
   _mapMaybeWithIndex(fa, f);

export const _mapMaybe: TC.UC_MapMaybeF<[URI], V> = (fa, f) =>
   _mapMaybeWithIndex(fa, (_, a) => f(a));

export const mapMaybe: TC.MapMaybeF<[URI], V> = (f) => (fa) =>
   _mapMaybeWithIndex(fa, (_, a) => f(a));

export const _extend: TC.UC_ExtendF<[URI], V> = (wa, f) =>
   _mapWithIndex(wa, (i, _) => f(wa.slice(i)));

/**
 * extend :: Extend w => (w -> b) -> w b
 */
export const extend: TC.ExtendF<[URI], V> = (f) => (wa) => _extend(wa, f);

/**
 * flatten :: Monad m => m m a -> m a
 */
export const flatten: TC.FlattenF<[URI], V> = (mma) => {
   let rLen = 0;
   const len = mma.length;
   for (let i = 0; i < len; i++) {
      rLen += mma[i].length;
   }
   const r = Array(rLen);
   let start = 0;
   for (let i = 0; i < len; i++) {
      const arr = mma[i];
      const l = arr.length;
      for (let j = 0; j < l; j++) {
         r[j + start] = arr[j];
      }
      start += l;
   }
   return r;
};

export const compact: TC.CompactF<[URI], V> = (as) => _mapMaybe(as, identity);

export const separate: TC.SeparateF<[URI], V> = (fa) => {
   const len = fa.length;
   const left = [];
   const right = [];
   for (let i = 0; i < len; i++) {
      const e = fa[i];
      if (e._tag === "Left") {
         left.push(e.left);
      } else {
         right.push(e.right);
      }
   }
   return {
      left,
      right
   };
};

export const _reduceWithIndex: TC.UC_ReduceWithIndexF<[URI], V> = (fa, b, f) => {
   const len = fa.length;
   let r = b;
   for (let i = 0; i < len; i++) {
      r = f(i, r, fa[i]);
   }
   return r;
};

export const reduceWithIndex: TC.ReduceWithIndexF<[URI], V> = (b, f) => (fa) =>
   _reduceWithIndex(fa, b, f);

export const _reduce: TC.UC_ReduceF<[URI], V> = (fa, b, f) =>
   _reduceWithIndex(fa, b, (_, b, a) => f(b, a));

/**
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 */
export const reduce: TC.ReduceF<[URI], V> = (b, f) => (fa) =>
   _reduceWithIndex(fa, b, (_, b, a) => f(b, a));

export const _partitionWithIndex: TC.UC_PartitionWithIndexF<[URI], V> = <A>(
   ta: ReadonlyArray<A>,
   predicate: PredicateWithIndex<number, A>
) => {
   const left: Array<A> = [];
   const right: Array<A> = [];
   for (let i = 0; i < ta.length; i++) {
      const a = ta[i];
      if (predicate(i, a)) {
         right.push(a);
      } else {
         left.push(a);
      }
   }
   return {
      left,
      right
   };
};

export const partitionWithIndex: TC.PartitionWithIndexF<[URI], V> = <A>(
   predicate: PredicateWithIndex<number, A>
) => (ta: ReadonlyArray<A>) => _partitionWithIndex(ta, predicate);

export const _partition: TC.UC_PartitionF<[URI], V> = <A>(
   ta: ReadonlyArray<A>,
   predicate: Predicate<A>
) => _partitionWithIndex(ta, (_, a) => predicate(a));

export const partition: TC.PartitionF<[URI], V> = <A>(predicate: Predicate<A>) => (
   ta: ReadonlyArray<A>
) => _partitionWithIndex(ta, (_, a) => predicate(a));

export const _mapEitherWithIndex: TC.UC_MapEitherWithIndexF<[URI], V> = (ta, f) => {
   const left = [];
   const right = [];
   for (let i = 0; i < ta.length; i++) {
      const e = f(i, ta[i]);
      if (e._tag === "Left") {
         left.push(e.left);
      } else {
         right.push(e.right);
      }
   }
   return {
      left,
      right
   };
};

export const mapEitherWithIndex: TC.MapEitherWithIndexF<[URI], V> = (f) => (ta) =>
   _mapEitherWithIndex(ta, f);

export const _partitionMap: TC.UC_MapEitherF<[URI], V> = (fa, f) =>
   _mapEitherWithIndex(fa, (_, a) => f(a));

export const partitionMap: TC.MapEitherF<[URI], V> = (f) => (ta) =>
   _mapEitherWithIndex(ta, (_, a) => f(a));

export const _alt: TC.UC_AltF<[URI], V> = (fa, that) => _append(fa, that());

export const alt: TC.AltF<[URI], V> = (that) => (fa) => _alt(fa, that);

export const _traverseWithIndex: TC.UC_TraverseWithIndexF<
   [URI],
   V
> = TC.implementUCTraverseWithIndex<[URI], V>()((_) => (G) => (ta, f) =>
   pipe(
      ta,
      reduceWithIndex(G.pure(none()), (i, fbs, a) =>
         pipe(
            fbs,
            G.map((bs) => (b: typeof _.B) => snoc(b)(bs)),
            G.ap(f(i, a))
         )
      )
   )
);

export const traverseWithIndex: TC.TraverseWithIndexF<[URI], V> = (A) => (f) => (ta) =>
   _traverseWithIndex(A)(ta, f);

export const _traverse: TC.UC_TraverseF<[URI], V> = (A) => (ta, f) =>
   _traverseWithIndex(A)(ta, (_, a) => f(a));

export const traverse: TC.TraverseF<[URI], V> = (A) => (f) => (ta) =>
   _traverseWithIndex(A)(ta, (_, a) => f(a));

export const _witherWithIndex: TC.UC_WitherWithIndexF<[URI], V> = (G) => {
   const traverseG = _traverseWithIndex(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(compact));
};

export const witherWithIndex: TC.WitherWithIndexF<[URI], V> = (G) => (f) => (wa) =>
   _witherWithIndex(G)(wa, f);

export const _wither: TC.UC_WitherF<[URI], V> = (G) => (wa, f) =>
   _witherWithIndex(G)(wa, (_, a) => f(a));

export const wither: TC.WitherF<[URI], V> = (G) => (f) => (wa) => _wither(G)(wa, f);

export const _wiltWithIndex: TC.UC_WiltWithIndexF<[URI], V> = (G) => {
   const traverseG = _traverseWithIndex(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
};

export const wiltWithIndex: TC.WiltWithIndexF<[URI], V> = (G) => (f) => (wa) =>
   _wiltWithIndex(G)(wa, f);

export const _wilt: TC.UC_WiltF<[URI], V> = (G) => (wa, f) => _wiltWithIndex(G)(wa, (_, a) => f(a));

export const wilt: TC.WiltF<[URI], V> = (G) => (f) => (wa) => _wilt(G)(wa, f);

export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) =>
   flatten(
      pipe(
         fab,
         map((f) => pipe(fa, map(f)))
      )
   );

export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

export const apFirst: <B>(fb: ReadonlyArray<B>) => <A>(fa: ReadonlyArray<A>) => ReadonlyArray<A> = (
   fb
) =>
   flow(
      map((a) => () => a),
      ap(fb)
   );

export const apSecond = <B>(
   fb: ReadonlyArray<B>
): (<A>(fa: ReadonlyArray<A>) => ReadonlyArray<B>) =>
   flow(
      map(() => (b: B) => b),
      ap(fb)
   );

export const _tap: TC.UC_TapF<[URI], V> = (ma, f) =>
   _chain(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

export const tap: TC.TapF<[URI], V> = (f) => (ma) => _tap(ma, f);

export const chainFirst: TC.ChainFirstF<[URI], V> = (f) => (fa) => _tap(fa, f);

export const duplicate: <A>(wa: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> = (wa) =>
   _extend(wa, identity);

export const _foldMapWithIndex: TC.UC_FoldMapWithIndexF<[URI], V> = (M) => (fa, f) =>
   _reduceWithIndex(fa, M.empty, (i, b, a) => M.concat(b)(f(i, a)));

export const foldMapWithIndex: TC.FoldMapWithIndexF<[URI], V> = (M) => (f) => (fa) =>
   _foldMapWithIndex(M)(fa, f);

export const _foldMap: TC.UC_FoldMapF<[URI], V> = (M) => {
   const _foldMapWithIndexM = _foldMapWithIndex(M);
   return (fa, f) => _foldMapWithIndexM(fa, (_, a) => f(a));
};

export const foldMap: TC.FoldMapF<[URI], V> = (M) => (f) => (fa) => _foldMap(M)(fa, f);

export const _reduceRightWithIndex: TC.UC_ReduceRightWithIndexF<[URI], V> = (fa, b, f) => {
   let r = b;
   for (let i = fa.length - 1; i >= 0; i--) {
      r = f(i, fa[i], b);
   }
   return r;
};

export const reduceRightWithIndex: TC.ReduceRightWithIndexF<[URI], V> = (b, f) => (fa) =>
   _reduceRightWithIndex(fa, b, f);

export const _reduceRight: TC.UC_ReduceRightF<[URI], V> = (fa, b, f) =>
   _reduceRightWithIndex(fa, b, (_, a, b) => f(a, b));

export const reduceRight: TC.ReduceRightF<[URI], V> = (b, f) => (fa) => _reduceRight(fa, b, f);

export const sequence: TC.SequenceF<[URI], V> = TC.implementSequence<[URI], V>()(
   (_) => (G) => (ta) =>
      pipe(
         ta,
         reduce(G.pure(none()), (fas, fa) =>
            pipe(
               fas,
               G.map((as) => (a: typeof _.A) => snoc(a)(as)),
               G.ap(fa)
            )
         )
      )
);

export const unfold: TC.UnfoldF<[URI], V> = (b, f) => {
   const ret = [];
   let bb = b;
   /* eslint-disable-next-line */
   while (true) {
      const mt = f(bb);
      if (isJust(mt)) {
         const [a, b] = mt.value;
         ret.push(a);
         bb = b;
      } else {
         break;
      }
   }
   return ret;
};
