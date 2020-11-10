import * as T from "./_internal/task";
import { Managed } from "./model";
import type { ReleaseMap } from "./ReleaseMap";

/*
 * -------------------------------------------
 * Functor Managed
 * -------------------------------------------
 */

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map_ = <R, E, A, B>(fa: Managed<R, E, A>, f: (a: A) => B) =>
   new Managed<R, E, B>(T.map_(fa.task, ([fin, a]) => [fin, f(a)]));

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => <R, E>(fa: Managed<R, E, A>) => map_(fa, f);

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapM_ = <R, E, A, R1, E1, B>(fa: Managed<R, E, A>, f: (a: A) => T.Task<R1, E1, B>) =>
   new Managed<R & R1, E | E1, B>(
      T.chain_(fa.task, ([fin, a]) =>
         T.gives_(
            T.map_(f(a), (b) => [fin, b]),
            ([r]: readonly [R & R1, ReleaseMap]) => r
         )
      )
   );

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapM = <R1, E1, A, B>(f: (a: A) => T.Task<R1, E1, B>) => <R, E>(fa: Managed<R, E, A>) => mapM_(fa, f);
