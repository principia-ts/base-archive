import * as P from "@principia/prelude";
import { apF, pureF } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { empty } from "./constructors";
import { Functor, FunctorWithIndex } from "./functor";
import type { URI, V } from "./model";
import { keys } from "./utils";

/*
 * -------------------------------------------
 * Traversable Record
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> (t a, ((k, a) -> g b)) -> g (t b)
 * ```
 */
export const traverseWithIndex_: P.TraverseWithIndexFn_<[URI], V> = P.implementTraverseWithIndex_<[URI], V>()(
   (_) => (G) => {
      const pure = pureF(G);
      const ap = apF(G);

      return (ta, f) => {
         type _ = typeof _;

         const ks = keys(ta);
         if (ks.length === 0) {
            return pure(empty);
         }
         let gr: HKT.HKT<_["G"], Record<_["N"], _["B"]>> = pure({}) as any;
         for (let i = 0; i < ks.length; i++) {
            const key = ks[i];
            gr = pipe(
               gr,
               G.map((r) => (b: _["B"]) => {
                  r[key] = b;
                  return r;
               }),
               ap(f(key, ta[key]))
            );
         }
         return gr;
      };
   }
);

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> ((k, a) -> g b) -> t a -> g (t b)
 * ```
 */
export const traverseWithIndex: P.TraverseWithIndexFn<[URI], V> = (G) => (f) => (ta) => traverseWithIndex_(G)(ta, f);

/**
 * ```haskell
 * traverse_ :: (Applicative g, Traversable t) =>
 *    g -> (t a, (a -> g b)) -> g (t b)
 * ```
 */
export const traverse_: P.TraverseFn_<[URI], V> = (G) => (ta, f) => traverseWithIndex_(G)(ta, (_, a) => f(a));

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g -> (a -> g b) -> t a -> g (t b)
 * ```
 */
export const traverse: P.TraverseFn<[URI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative g, Traversable t) => g -> t a -> g (t a)
 * ```
 */
export const sequence: P.SequenceFn<[URI], V> = (G) => (ta) => traverseWithIndex_(G)(ta, (_, a) => a);

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   traverse_: traverse_,
   traverse,
   sequence
});

export const TraversableWithIndex: P.TraversableWithIndex<[URI], V> = HKT.instance({
   ...FunctorWithIndex,
   traverseWithIndex_,
   traverseWithIndex
});
