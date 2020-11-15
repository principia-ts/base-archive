import * as A from "../Array/_core";
import { identity } from "../Function";
import { map_ } from "./functor";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Monad Tree
 * -------------------------------------------
 */

export function chain_<A, B>(ma: Tree<A>, f: (a: A) => Tree<B>): Tree<B> {
   const { value, forest } = f(ma.value);
   const combine = A.getMonoid<Tree<B>>().combine_;
   return {
      value,
      forest: combine(
         forest,
         A.map_(ma.forest, (a) => chain_(a, f))
      )
   };
}

export function chain<A, B>(f: (a: A) => Tree<B>): (ma: Tree<A>) => Tree<B> {
   return (ma) => chain_(ma, f);
}

export const flatten: <A>(mma: Tree<Tree<A>>) => Tree<A> = chain(identity);

export function tap_<A, B>(ma: Tree<A>, f: (a: A) => Tree<B>): Tree<A> {
   return chain_(ma, (a) => map_(f(a), () => a));
}

export function tap<A, B>(f: (a: A) => Tree<B>): (ma: Tree<A>) => Tree<A> {
   return (ma) => tap_(ma, f);
}
