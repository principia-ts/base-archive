import { map_ } from "./functor";
import type { Async } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Sequential Apply Async
 * -------------------------------------------
 */

export const mapBoth_ = <R, E, A, R1, E1, B, C>(
   fa: Async<R, E, A>,
   fb: Async<R1, E1, B>,
   f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> => chain_(fa, (a) => map_(fb, (b) => f(a, b)));

export const mapBoth = <A, R1, E1, B, C>(fb: Async<R1, E1, B>, f: (a: A, b: B) => C) => <R, E>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, C> => mapBoth_(fa, fb, f);

export const ap_ = <R, E, A, R1, E1, B>(
   fab: Async<R1, E1, (a: A) => B>,
   fa: Async<R, E, A>
): Async<R & R1, E | E1, B> => mapBoth_(fab, fa, (f, a) => f(a));

export const ap = <R, E, A>(fa: Async<R, E, A>) => <R1, E1, B>(
   fab: Async<R1, E1, (a: A) => B>
): Async<R & R1, E | E1, B> => ap_(fab, fa);

export const apFirst_ = <R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A> =>
   mapBoth_(fa, fb, (a, _) => a);

export const apFirst = <R1, E1, A1>(fb: Async<R1, E1, A1>) => <R, E, A>(fa: Async<R, E, A>): Async<R & R1, E | E1, A> =>
   apFirst_(fa, fb);

export const apSecond_ = <R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A1> =>
   mapBoth_(fa, fb, (_, b) => b);

export const apSecond = <R1, E1, A1>(fb: Async<R1, E1, A1>) => <R, E, A>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, A1> => apSecond_(fa, fb);
