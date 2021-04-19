import type { Either } from '../../Either'
import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { NonEmptyArray } from '../../NonEmptyArray'
import type { IO } from '../core'

import * as A from '../../Array/core'
import * as E from '../../Either'
import { attempt, foreach_, map_, refail } from '../core'
import { foreachExec_ } from './foreachExec'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'

const mergeExits = <E, B>() => (exits: ReadonlyArray<Either<E, B>>): Either<NonEmptyArray<E>, Array<B>> => {
  const errors  = [] as E[]
  const results = [] as B[]

  exits.forEach((e) => {
    if (e._tag === 'Left') {
      errors.push(e.left)
    } else {
      results.push(e.right)
    }
  })

  return A.isNonEmpty(errors) ? E.Left(errors) : E.Right(results)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validate_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>) {
  return refail(
    map_(
      foreach_(as, (a) => attempt(f(a))),
      mergeExits<E, B>()
    )
  )
}

export function validate<A, R, E, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, NonEmptyArray<E>, B[]> {
  return (as) => validate_(as, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validatePar_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>) {
  return refail(
    map_(
      foreachPar_(as, (a) => attempt(f(a))),
      mergeExits<E, B>()
    )
  )
}

export function validatePar<A, R, E, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, NonEmptyArray<E>, B[]> {
  return (as) => validatePar_(as, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validateParN_<A, R, E, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => IO<R, E, B>
): IO<R, NonEmptyArray<E>, ReadonlyArray<B>> {
  return refail(
    map_(
      foreachParN_(as, n, (a) => attempt(f(a))),
      mergeExits<E, B>()
    )
  )
}

export function validateParN<A, R, E, B>(
  n: number,
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, NonEmptyArray<E>, readonly B[]> {
  return (as) => validateParN_(as, n, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validateExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => IO<R, E, B>
): IO<R, NonEmptyArray<E>, ReadonlyArray<B>> {
  return refail(
    map_(
      foreachExec_(as, es, (a) => attempt(f(a))),
      mergeExits<E, B>()
    )
  )
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export function validateExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, NonEmptyArray<E>, ReadonlyArray<B>> {
  return (as) => validateExec_(as, es, f)
}
