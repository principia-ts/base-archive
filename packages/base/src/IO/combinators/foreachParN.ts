// tracing: off

import type { Chunk } from '../../Chunk/core'

import { traceAs } from '@principia/compile/util'
import { tuple } from '@principia/prelude/tuple'

import { pipe } from '../../function'
import * as L from '../../List/core'
import * as P from '../../Promise'
import * as Q from '../../Queue'
import * as Ref from '../../Ref'
import * as I from '../core'
import { bracket } from './bracket'

/**
 * @trace 2
 */
export function foreachParN_<A, R, E, B>(as: Iterable<A>, n: number, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  const worker = (
    q: Q.Queue<readonly [P.Promise<E, B>, A]>,
    pairs: Iterable<readonly [P.Promise<E, B>, A]>,
    ref: Ref.URef<number>
  ): I.URIO<R, void> =>
    pipe(
      q.take,
      I.bind(
        traceAs(f, ([p, a]) =>
          pipe(
            f(a),
            I.matchCauseM(
              (c) => I.foreach_(pairs, (_) => _[0].halt(c)),
              (b) => p.succeed(b)
            )
          )
        )
      ),
      I.bind(() => worker(q, pairs, ref)),
      I.whenM(Ref.modify_(ref, (n) => tuple(n > 0, n - 1)))
    )

  return pipe(
    Q.makeBounded<readonly [P.Promise<E, B>, A]>(n),
    bracket(
      (q) =>
        I.gen(function* (_) {
          const pairs = yield* _(
            I.foreach_(as, (a) =>
              pipe(
                P.make<E, B>(),
                I.map((p) => tuple(p, a))
              )
            )
          )
          const ref   = yield* _(Ref.makeRef(pairs.length))
          yield* _(I.fork(I.foreach_(pairs, (pair) => q.offer(pair))))
          yield* _(
            I.collectAllUnit(
              pipe(
                L.range(0, n),
                L.map(() => I.fork(worker(q, pairs, ref)))
              )
            )
          )
          const res = yield* _(I.foreach_(pairs, (_) => _[0].await))

          return res
        }),
      (q) => q.shutdown
    )
  )
}

/**
 * @trace 1
 */
export function foreachParN<R, E, A, B>(
  n: number,
  f: (a: A) => I.IO<R, E, B>
): (as: Iterable<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => foreachParN_(as, n, f)
}
