import type { FreeBooleanAlgebra } from './model'
import type { IO } from '@principia/io/IO'

import * as I from '@principia/io/IO'

import { failure, success } from './constructors'
import { isFalse, isTrue } from './fold'
import { and_, iff_, implies_, not, or_ } from './operations'

export type FreeBooleanAlgebraM<R, E, A> = IO<R, E, FreeBooleanAlgebra<A>>

export function andM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.map2_(ma, mb, (ba, bb) => and_(ba, bb))
}

export function andM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => andM_(ma, mb)
}

export function orM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.map2_(ma, mb, (ba, bb) => or_(ba, bb))
}

export function orM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => orM_(ma, mb)
}

export function notM<R, E, A>(ma: FreeBooleanAlgebraM<R, E, A>): FreeBooleanAlgebraM<R, E, A> {
  return I.map_(ma, not)
}

export function impliesM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.map2_(ma, mb, (ba, bb) => implies_(ba, bb))
}

export function impliesM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => impliesM_(ma, mb)
}

export function iffM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.map2_(ma, mb, (ba, bb) => iff_(ba, bb))
}

export function iffM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => iffM_(ma, mb)
}

export function isTrueM<R, E, A>(ma: FreeBooleanAlgebraM<R, E, A>): IO<R, E, boolean> {
  return I.map_(ma, isTrue)
}

export function isFalseM<R, E, A>(ma: FreeBooleanAlgebraM<R, E, A>): IO<R, E, boolean> {
  return I.map_(ma, isFalse)
}

export function successM<A>(a: A): FreeBooleanAlgebraM<unknown, never, A> {
  return I.succeed(success(a))
}

export function failureM<A>(a: A): FreeBooleanAlgebraM<unknown, never, A> {
  return I.succeed(failure(a))
}

export function fromIO<R, E, A>(io: IO<R, E, A>): FreeBooleanAlgebraM<R, E, A> {
  return I.map_(io, success)
}
