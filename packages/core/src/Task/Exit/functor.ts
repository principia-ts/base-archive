import { succeed } from "./constructors";
import { isFailure } from "./guards";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Functor Exit
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: Exit<E, A>, f: (a: A) => B): Exit<E, B> {
   return isFailure(fa) ? fa : succeed(f(fa.value));
}

export function map<A, B>(f: (a: A) => B): <E>(fa: Exit<E, A>) => Exit<E, B> {
   return (fa) => map_(fa, f);
}
