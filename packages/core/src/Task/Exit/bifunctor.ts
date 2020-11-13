import * as C from "./Cause";
import { failure } from "./constructors";
import { map_ } from "./functor";
import { isFailure } from "./guards";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Exit
 * -------------------------------------------
 */

export function mapError_<E, A, G>(pab: Exit<E, A>, f: (e: E) => G): Exit<G, A> {
   return isFailure(pab) ? failure(C.map_(pab.cause, f)) : pab;
}

export function mapError<E, G>(f: (e: E) => G): <A>(pab: Exit<E, A>) => Exit<G, A> {
   return (pab) => mapError_(pab, f);
}

export function bimap_<E, A, G, B>(pab: Exit<E, A>, f: (e: E) => G, g: (a: A) => B): Exit<G, B> {
   return isFailure(pab) ? mapError_(pab, f) : map_(pab, g);
}

export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: Exit<E, A>) => Exit<G, B> {
   return (pab) => bimap_(pab, f, g);
}
