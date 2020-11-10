import { succeed } from "./constructors";
import { isFailure } from "./guards";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Functor Exit
 * -------------------------------------------
 */

export const map_ = <E, A, B>(fa: Exit<E, A>, f: (a: A) => B): Exit<E, B> =>
   isFailure(fa) ? fa : succeed(f(fa.value));

export const map = <A, B>(f: (a: A) => B) => <E>(fa: Exit<E, A>): Exit<E, B> => map_(fa, f);
