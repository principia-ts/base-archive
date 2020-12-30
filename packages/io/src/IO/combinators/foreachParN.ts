import * as A from '@principia/base/data/Array'
import { pipe, tuple } from '@principia/base/data/Function'

import { interrupt as interruptFiber } from '../../Fiber/combinators/interrupt'
import * as XP from '../../Promise'
import * as Q from '../../Queue'
import * as I from '../core'
import { bracket } from './bracket'
import { collectAll } from './collectAll'
import { forever } from './forever'

export function foreachParN_(n: number) {
  return <A, R, E, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, ReadonlyArray<B>> =>
    pipe(
      Q.makeBounded<readonly [XP.Promise<E, B>, A]>(n),
      bracket(
        (q) =>
          pipe(
            I.do,
            I.bindS('pairs', () =>
              pipe(
                as,
                I.foreach((a) =>
                  pipe(
                    XP.make<E, B>(),
                    I.map((p) => tuple(p, a))
                  )
                )
              )
            ),
            I.tap(({ pairs }) => pipe(pairs, I.foreachUnit(q.offer), I.fork)),
            I.bindS('fibers', ({ pairs }) =>
              pipe(
                A.makeBy(n, () =>
                  pipe(
                    q.take,
                    I.flatMap(([p, a]) =>
                      pipe(
                        f(a),
                        I.foldCauseM(
                          (c) =>
                            pipe(
                              pairs,
                              I.foreach(([promise, _]) => pipe(promise, XP.halt(c)))
                            ),
                          (b) => pipe(p, XP.succeed(b))
                        )
                      )
                    ),
                    forever,
                    I.fork
                  )
                ),
                collectAll
              )
            ),
            I.bindS('res', ({ fibers, pairs }) =>
              pipe(
                pairs,
                I.foreach(([p]) => XP.await(p)),
                I.result,
                I.tap(() => pipe(fibers, I.foreach(interruptFiber))),
                I.flatMap(I.done)
              )
            ),
            I.map(({ res }) => res)
          ),
        (q) => q.shutdown
      )
    )
}

export function foreachParN(
  n: number
): <R, E, A, B>(f: (a: A) => I.IO<R, E, B>) => (as: Iterable<A>) => I.IO<R, E, readonly B[]> {
  return (f) => (as) => foreachParN_(n)(as, f)
}
