import type { Chunk } from '../../Chunk'
import type { Exit } from '../../Exit'
import type { Stream } from '../core'
import type { Either } from '@principia/base/data/Either'
import type { Option } from '@principia/base/data/Option'

import * as E from '@principia/base/data/Either'
import { pipe, tuple } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as Ca from '../../Cause'
import * as C from '../../Chunk'
import * as Ex from '../../Exit'
import * as I from '../../IO'
import { combineChunks_ } from './combineChunks'

function _zipChunks<A, B, C>(
  fa: Chunk<A>,
  fb: Chunk<B>,
  f: (a: A, b: B) => C
): [Chunk<C>, E.Either<Chunk<A>, Chunk<B>>] {
  const fc: Array<C> = []
  const len          = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i], fb[i])
  }

  if (fa.length > fb.length) {
    return [fc, E.left(C.drop_(fa, fb.length))]
  }

  return [fc, E.right(C.drop_(fb, fa.length))]
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWithPar_<R, E, O, O2, O3, R1, E1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'seq'
): Stream<R & R1, E1 | E, O3>
export function zipWithPar_<R, E, O, O2, O3, R1, E1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps?: 'par' | 'seq'
): Stream<R & R1, E1 | E, O3>
export function zipWithPar_<R, E, O, O2, O3, R1, E1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'par' | 'seq' = 'par'
): Stream<R & R1, E1 | E, O3> {
  type End = { _tag: 'End' }
  type RightDone<W2> = { _tag: 'RightDone', excessR: Chunk<W2> }
  type LeftDone<W1> = { _tag: 'LeftDone', excessL: Chunk<W1> }
  type Running<W1, W2> = {
    _tag: 'Running'
    excess: Either<Chunk<W1>, Chunk<W2>>
  }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: Option<Chunk<O>>,
    rightUpd: Option<Chunk<O2>>,
    excess: Either<Chunk<O>, Chunk<O2>>
  ): Exit<Option<never>, readonly [Chunk<O3>, State<O, O2>]> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      E.fold(
        (l) => tuple<[Chunk<O>, Chunk<O2>]>(l, C.empty()),
        (r) => tuple<[Chunk<O>, Chunk<O2>]>(C.empty(), r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        O.fold(
          () => leftExcess,
          (upd) => C.concat_(leftExcess, upd)
        )
      ),
      pipe(
        rightUpd,
        O.fold(
          () => rightExcess,
          (upd) => C.concat_(rightExcess, upd)
        )
      )
    ]

    const [emit, newExcess] = _zipChunks(left, right, f)

    if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
      return Ex.succeed(
        tuple<[Chunk<O3>, State<O, O2>]>(emit, {
          _tag: 'Running',
          excess: newExcess
        })
      )
    } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
      return Ex.fail(O.none())
    } else {
      return Ex.succeed(
        tuple(
          emit,
          pipe(
            newExcess,
            E.fold(
              (l): State<O, O2> =>
                !C.isEmpty(l)
                  ? {
                    _tag: 'LeftDone',
                    excessL: l
                  }
                  : { _tag: 'End' },
              (r): State<O, O2> =>
                !C.isEmpty(r)
                  ? {
                    _tag: 'RightDone',
                    excessR: r
                  }
                  : { _tag: 'End' }
            )
          )
        )
      )
    }
  }

  return combineChunks_(
    stream,
    that,
    <State<O, O2>>{
      _tag: 'Running',
      excess: E.left(C.empty())
    },
    (st, p1, p2) => {
      switch (st._tag) {
        case 'End': {
          return I.pure(Ex.fail(O.none()))
        }
        case 'Running': {
          return pipe(
            p1,
            I.optional,
            ps === 'par'
              ? I.map2Par(I.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
              : I.map2(I.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
            I.catchAllCause((e) => I.pure(Ex.failure(pipe(e, Ca.map(O.some)))))
          )
        }
        case 'LeftDone': {
          return pipe(
            p2,
            I.optional,
            I.map((r) => handleSuccess(O.none(), r, E.left(st.excessL))),
            I.catchAllCause((e) => I.pure(Ex.failure(pipe(e, Ca.map(O.some)))))
          )
        }
        case 'RightDone': {
          return pipe(
            p1,
            I.optional,
            I.map((l) => handleSuccess(l, O.none(), E.right(st.excessR))),
            I.catchAllCause((e) => I.pure(Ex.failure(pipe(e, Ca.map(O.some)))))
          )
        }
      }
    }
  )
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWithPar<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'seq'
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>
export function zipWithPar<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps?: 'par' | 'seq'
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>
export function zipWithPar<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'par' | 'seq' = 'par'
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3> {
  return (stream) => zipWithPar_(stream, that, f, ps)
}
