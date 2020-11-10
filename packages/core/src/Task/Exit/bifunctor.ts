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

export const mapError_ = <E, A, G>(pab: Exit<E, A>, f: (e: E) => G): Exit<G, A> =>
   isFailure(pab) ? failure(C.map_(pab.cause, f)) : pab;

export const mapError = <E, G>(f: (e: E) => G) => <A>(pab: Exit<E, A>): Exit<G, A> => mapError_(pab, f);

export const bimap_ = <E, A, G, B>(pab: Exit<E, A>, f: (e: E) => G, g: (a: A) => B): Exit<G, B> =>
   isFailure(pab) ? mapError_(pab, f) : map_(pab, g);

export const bimap = <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => (pab: Exit<E, A>): Exit<G, B> => bimap_(pab, f, g);
