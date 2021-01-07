import type { IO } from '../IO/core'
import type * as HKT from '@principia/base/HKT'

import { matchTag_ } from '@principia/base/util/matchers'

import * as I from '../IO/core'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type Decision<R, I, O> = Done<O> | Continue<R, I, O>

export interface Continue<R, I, O> {
  readonly _tag: 'Continue'
  readonly out: O
  readonly interval: number
  readonly next: StepFunction<R, I, O>
}

export interface Done<O> {
  readonly _tag: 'Done'
  readonly out: O
}

export type StepFunction<R, I, O> = (interval: number, input: I) => IO<R, never, Decision<R, I, O>>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeDone<O>(out: O): Done<O> {
  return {
    _tag: 'Done',
    out
  }
}

export function makeContinue<R, I, O>(out: O, interval: number, next: StepFunction<R, I, O>): Decision<R, I, O> {
  return {
    _tag: 'Continue',
    out,
    interval,
    next
  }
}

export function toDone<R, I, O>(decision: Decision<R, I, O>): Done<O> {
  return matchTag_(decision, {
    Done: (_) => _,
    Continue: (c) => makeDone(c.out)
  })
}

export function done<A>(a: A): StepFunction<unknown, unknown, A> {
  return () => I.pure(makeDone(a))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<R, I, A, B>(fa: Decision<R, I, A>, f: (a: A) => B): Decision<R, I, B> {
  switch (fa._tag) {
    case 'Done':
      return makeDone(f(fa.out))
    case 'Continue':
      return makeContinue(f(fa.out), fa.interval, (n, i) => I.map_(fa.next(n, i), (a) => map_(a, f)))
  }
}

export function map<A, B>(f: (a: A) => B): <R, I>(fa: Decision<R, I, A>) => Decision<R, I, B> {
  return (fa) => map_(fa, f)
}

export function as_<R, I, O, O1>(fa: Decision<R, I, O>, o: O1): Decision<R, I, O1> {
  return map_(fa, () => o)
}

export function as<O1>(o: O1): <R, I, O>(fa: Decision<R, I, O>) => Decision<R, I, O1> {
  return (fa) => as_(fa, o)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function contramapIn_<R, I, I1, O>(fa: Decision<R, I, O>, f: (i: I1) => I): Decision<R, I1, O> {
  switch (fa._tag) {
    case 'Done':
      return fa
    case 'Continue':
      return makeContinue(fa.out, fa.interval, (n, i) => I.map_(fa.next(n, f(i)), (a) => contramapIn_(a, f)))
  }
}

export function contramapIn<I, I1>(f: (i: I1) => I): <R, O>(fa: Decision<R, I, O>) => Decision<R, I1, O> {
  return (fa) => contramapIn_(fa, f)
}
