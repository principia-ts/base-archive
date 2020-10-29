import * as A from "../Array";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Applicative Tree
 * -------------------------------------------
 */

export const both_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<readonly [A, B]> => ({
   value: [fa.value, fb.value],
   forest: A.comprehension([fa.forest, fb.forest], (a, b) => both_(a, b))
});

export const both = <B>(fb: Tree<B>) => <A>(fa: Tree<A>): Tree<readonly [A, B]> => both_(fa, fb);

export const pure = <A>(a: A): Tree<A> => ({
   value: a,
   forest: A.empty()
});
