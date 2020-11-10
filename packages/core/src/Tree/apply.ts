import * as A from "../Array";
import { map_ } from "./functor";
import type { Tree } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Tree
 * -------------------------------------------
 */

export const mapBoth_ = <A, B, C>(fa: Tree<A>, fb: Tree<B>, f: (a: A, b: B) => C): Tree<C> => ({
   value: f(fa.value, fb.value),
   forest: A.comprehension([fa.forest, fb.forest], (a, b) => mapBoth_(a, b, f))
});

export const mapBoth = <A, B, C>(fb: Tree<B>, f: (a: A, b: B) => C) => (fa: Tree<A>): Tree<C> => mapBoth_(fa, fb, f);

export const ap_ = <A, B>(fab: Tree<(a: A) => B>, fa: Tree<A>): Tree<B> => chain_(fab, (f) => map_(fa, (a) => f(a)));

export const ap = <A>(fa: Tree<A>) => <B>(fab: Tree<(a: A) => B>): Tree<B> => ap_(fab, fa);

export const apFirst_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<A> => mapBoth_(fa, fb, (a, _) => a);

export const apFirst = <B>(fb: Tree<B>) => <A>(fa: Tree<A>): Tree<A> => apFirst_(fa, fb);

export const apSecond_ = <A, B>(fa: Tree<A>, fb: Tree<B>): Tree<B> => mapBoth_(fa, fb, (_, b) => b);
