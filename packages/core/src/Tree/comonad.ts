import * as A from "../Array";
import { identity } from "../Function";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Comonad Tree
 * -------------------------------------------
 */

export function extend_<A, B>(wa: Tree<A>, f: (wa: Tree<A>) => B): Tree<B> {
   return {
      value: f(wa),
      forest: A.map_(wa.forest, (a) => extend_(a, f))
   };
}

export function extend<A, B>(f: (wa: Tree<A>) => B): (wa: Tree<A>) => Tree<B> {
   return (wa) => extend_(wa, f);
}

export const duplicate: <A>(wa: Tree<A>) => Tree<Tree<A>> = extend(identity);

export function extract<A>(wa: Tree<A>): A {
   return wa.value;
}
