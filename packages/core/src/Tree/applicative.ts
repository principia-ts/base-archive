import * as A from "../Array/_core";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Applicative Tree
 * -------------------------------------------
 */

export function both_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<readonly [A, B]> {
   return {
      value: [fa.value, fb.value],
      forest: A.comprehension([fa.forest, fb.forest], (a, b) => both_(a, b))
   };
}

export function both<B>(fb: Tree<B>): <A>(fa: Tree<A>) => Tree<readonly [A, B]> {
   return (fa) => both_(fa, fb);
}

export function pure<A>(a: A): Tree<A> {
   return {
      value: a,
      forest: A.empty()
   };
}
