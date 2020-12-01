import * as A from "../Array/_core";
import type { _A, _E, _R } from "../Utils";
import { succeed } from "./constructors";
import { map_ } from "./functor";
import type { Async } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Sequential Apply Async
 * -------------------------------------------
 */

export function tuple<A extends ReadonlyArray<Async<any, any, any>>>(
  ...fas: A & { 0: Async<any, any, any> }
): Async<_R<A[number]>, _E<A[number]>, { [K in keyof A]: _A<A[K]> }> {
  return A.reduce_(
    fas,
    (succeed(A.empty<any>()) as unknown) as Async<
      _R<A[number]>,
      _E<A[number]>,
      { [K in keyof A]: _A<A[K]> }
    >,
    (b, a) => zipWith_(b, a, (acc, r) => A.append_(acc, r)) as any
  );
}

export function zipWith_<R, E, A, R1, E1, B, C>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)));
}

export function zipWith<A, R1, E1, B, C>(
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, C> {
  return (fa) => zipWith_(fa, fb, f);
}

export function ap_<R, E, A, R1, E1, B>(
  fab: Async<R1, E1, (a: A) => B>,
  fa: Async<R, E, A>
): Async<R & R1, E | E1, B> {
  return zipWith_(fab, fa, (f, a) => f(a));
}

export function ap<R, E, A>(
  fa: Async<R, E, A>
): <R1, E1, B>(fab: Async<R1, E1, (a: A) => B>) => Async<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A> {
  return zipWith_(fa, fb, (a, _) => a);
}

export function apFirst<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A1> {
  return zipWith_(fa, fb, (_, b) => b);
}

export function apSecond<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A1> {
  return (fa) => apSecond_(fa, fb);
}
