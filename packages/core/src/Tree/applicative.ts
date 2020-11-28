import * as A from "../Array/_core";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Applicative Tree
 * -------------------------------------------
 */

export function zip_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<readonly [A, B]> {
  return {
    value: [fa.value, fb.value],
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => zip_(a, b))
  };
}

export function zip<B>(fb: Tree<B>): <A>(fa: Tree<A>) => Tree<readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

export function pure<A>(a: A): Tree<A> {
  return {
    value: a,
    forest: A.empty()
  };
}
