import { pipe, tuple } from '@principia/base/Function'
import * as L from '@principia/base/List'

import * as Ref from '../../IORef'
import * as P from '../../Promise'
import * as Q from '../../Queue'
import * as I from '../core'
import { bracket } from './bracket'

export function foreachParN_(n: number) {
  return <A, R, E, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, ReadonlyArray<B>> => {
    const worker = (
      q: Q.Queue<readonly [P.Promise<E, B>, A]>,
      pairs: Iterable<readonly [P.Promise<E, B>, A]>,
      ref: Ref.URef<number>
    ): I.URIO<R, void> =>
      pipe(
        q.take,
        I.chain(([p, a]) =>
          pipe(
            f(a),
            I.foldCauseM(
              (c) => I.foreach_(pairs, (_) => _[0].halt(c)),
              (b) => p.succeed(b)
            )
          )
        ),
        I.chain(() => worker(q, pairs, ref)),
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
            const ref   = yield* _(Ref.make(pairs.length))
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
}

export function foreachParN(
  n: number
): <R, E, A, B>(f: (a: A) => I.IO<R, E, B>) => (as: Iterable<A>) => I.IO<R, E, readonly B[]> {
  return (f) => (as) => foreachParN_(n)(as, f)
}
