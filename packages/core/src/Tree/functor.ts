import * as A from "../Array";
import type { Tree } from "./model";

export function map_<A, B>(fa: Tree<A>, f: (a: A) => B): Tree<B> {
   return {
      value: f(fa.value),
      forest: A.map_(fa.forest, (a) => map_(a, f))
   };
}

export function map<A, B>(f: (a: A) => B): (fa: Tree<A>) => Tree<B> {
   return (fa) => map_(fa, f);
}
