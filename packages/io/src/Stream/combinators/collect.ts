import type { Chunk } from '../../Chunk'
import type { Exit } from '../../Exit'
import type { IO } from '../../IO'

import * as E from '@principia/base/data/Either'
import { flow, identity } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as C from '../../Chunk'
import * as Ex from '../../Exit'
import * as I from '../../IO'
import * as Ref from '../../IORef'
import * as M from '../../Managed'
import * as BPull from '../BufferedPull'
import { filterMap_, Stream } from '../core'
import * as Pull from '../Pull'

export function collectLeft<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, L> {
  return filterMap_(ma, O.getLeft)
}

export function collectRight<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, O> {
  return filterMap_(ma, O.getRight)
}

export function collectSome<R, E, O>(ma: Stream<R, E, O.Option<O>>): Stream<R, E, O> {
  return filterMap_(ma, identity)
}

export function collectSuccess<R, E, L, O>(ma: Stream<R, E, Exit<L, O>>): Stream<R, E, O> {
  return filterMap_(ma, (ex) => (Ex.isSuccess(ex) ? O.some(ex.value) : O.none()))
}

export function collectWhile_<R, E, O, O1>(ma: Stream<R, E, O>, f: (o: O) => O.Option<O1>): Stream<R, E, O1> {
  return new Stream(
    M.gen(function* (_) {
      const chunks = yield* _(ma.proc)
      const done   = yield* _(Ref.makeManaged(false))
      return I.flatMap_(done.get, (b) =>
        b
          ? Pull.end
          : I.gen(function* (_) {
            const chunk     = yield* _(chunks)
            const remaining = C.collectWhileMap_(chunk, f)
            yield* _(I.when_(done.set(true), () => remaining.length < chunk.length))
            return remaining
          })
      )
    })
  )
}

export function collectWhile<O, O1>(f: (o: O) => O.Option<O1>): <R, E>(ma: Stream<R, E, O>) => Stream<R, E, O1> {
  return (ma) => collectWhile_(ma, f)
}

export function collectWhileLeft<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, L> {
  return collectWhile_(ma, O.getLeft)
}

export function collectWhileRight<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, O> {
  return collectWhile_(ma, O.getRight)
}

export function collectWhileSome<R, E, O>(ma: Stream<R, E, O.Option<O>>): Stream<R, E, O> {
  return collectWhile_(ma, identity)
}

export function collectWhileSuccess<R, E, L, O>(ma: Stream<R, E, Ex.Exit<L, O>>): Stream<R, E, O> {
  return collectWhile_(ma, (ex) => (Ex.isSuccess(ex) ? O.some(ex.value) : O.none()))
}

export function collectWhileM_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (o: O) => O.Option<IO<R1, E1, O1>>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    M.gen(function* (_) {
      const os   = yield* _(M.mapM_(ma.proc, BPull.make))
      const done = yield* _(Ref.makeManaged(false))
      return I.flatMap_(done.get, (b) =>
        b
          ? Pull.end
          : (I.flatMap_(
            BPull.pullElement(os),
            flow(
              f,
              O.fold(
                () => I.andThen_(done.set(true), Pull.end),
                I.bimap(O.some, (o1) => [o1])
              )
            )
          ) as IO<R & R1, O.Option<E | E1>, Chunk<O1>>)
      )
    })
  )
}

export function collectWhileM<O, R1, E1, O1>(
  f: (o: O) => O.Option<IO<R1, E1, O1>>
): <R, E>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (ma) => collectWhileM_(ma, f)
}
