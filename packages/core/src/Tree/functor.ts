import * as A from "../Array";
import type { Tree } from "./model";

export const map_ = <A, B>(fa: Tree<A>, f: (a: A) => B): Tree<B> => ({
   value: f(fa.value),
   forest: A.map_(fa.forest, (a) => map_(a, f))
});

export const map = <A, B>(f: (a: A) => B) => (fa: Tree<A>): Tree<B> => map_(fa, f);
