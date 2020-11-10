import * as A from "../Array";
import { identity } from "../Function";
import { map_ } from "./functor";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Monad Tree
 * -------------------------------------------
 */

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
