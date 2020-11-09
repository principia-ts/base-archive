import type { _A, _E, _R } from "../Utils/infer";
import { map_ } from "./functor";
import type { Async } from "./model";
import { AllInstruction } from "./model";

/*
 * -------------------------------------------
 * Parallel Apply Async
 * -------------------------------------------
 */

export const sequenceTPar = <A extends ReadonlyArray<Async<any, any, any>>>(
   ...asyncs: A & { 0: Async<any, any, any> }
): Async<_R<A[number]>, _E<A[number]>, { [K in keyof A]: _A<A[K]> }> => new AllInstruction(asyncs) as any;

export const mapBothPar_ = <R, E, A, R1, E1, B, C>(
   fa: Async<R, E, A>,
   fb: Async<R1, E1, B>,
   f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> => map_(sequenceTPar(fa, fb), ([a, b]) => f(a, b));

export const mapBothPar = <A, R1, E1, B, C>(fb: Async<R1, E1, B>, f: (a: A, b: B) => C) => <R, E>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, C> => mapBothPar_(fa, fb, f);

export const apPar_ = <R, E, A, R1, E1, B>(
   fab: Async<R1, E1, (a: A) => B>,
   fa: Async<R, E, A>
): Async<R & R1, E | E1, B> => mapBothPar_(fab, fa, (f, a) => f(a));

export const apPar = <R, E, A>(fa: Async<R, E, A>) => <R1, E1, B>(
   fab: Async<R1, E1, (a: A) => B>
): Async<R & R1, E | E1, B> => apPar_(fab, fa);

export const apFirstPar_ = <R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A> =>
   mapBothPar_(fa, fb, (a, _) => a);

export const apFirstPar = <R1, E1, A1>(fb: Async<R1, E1, A1>) => <R, E, A>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, A> => apFirstPar_(fa, fb);

export const apSecondPar_ = <R, E, A, R1, E1, A1>(
   fa: Async<R, E, A>,
   fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A1> => mapBothPar_(fa, fb, (_, b) => b);

export const apSecondPar = <R1, E1, A1>(fb: Async<R1, E1, A1>) => <R, E, A>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, A1> => apSecondPar_(fa, fb);
