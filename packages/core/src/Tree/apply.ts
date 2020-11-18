import * as A from "../Array/_core";
import { map_ } from "./functor";
import type { Tree } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Tree
 * -------------------------------------------
 */

export function mapBoth_<A, B, C>(fa: Tree<A>, fb: Tree<B>, f: (a: A, b: B) => C): Tree<C> {
  return {
    value: f(fa.value, fb.value),
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => mapBoth_(a, b, f))
  };
}

export function mapBoth<A, B, C>(fb: Tree<B>, f: (a: A, b: B) => C): (fa: Tree<A>) => Tree<C> {
  return (fa) => mapBoth_(fa, fb, f);
}

export function ap_<A, B>(fab: Tree<(a: A) => B>, fa: Tree<A>): Tree<B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)));
}

export function ap<A>(fa: Tree<A>): <B>(fab: Tree<(a: A) => B>) => Tree<B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<A> {
  return mapBoth_(fa, fb, (a, _) => a);
}

export function apFirst<B>(fb: Tree<B>): <A>(fa: Tree<A>) => Tree<A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<B> {
  return mapBoth_(fa, fb, (_, b) => b);
}
