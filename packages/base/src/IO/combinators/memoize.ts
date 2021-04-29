import type { Eq } from '../../Eq'
import type { IO, UIO } from '../core'

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as P from '../../Promise'
import * as RefM from '../../RefM'
import { tuple } from '../../tuple'
import * as I from '../core'
import { to } from './to'

/**
 * Returns a memoized version of the specified effectual function.
 *
 * @trace 0
 */
export function memoize<R, E, A, B>(f: (a: A) => IO<R, E, B>): UIO<(a: A) => IO<R, E, B>> {
  return pipe(
    RefM.makeRefM(new Map<A, P.Promise<E, B>>()),
    I.map(
      traceAs(f, (ref) => (a: A) =>
        I.gen(function* (_) {
          const promise = yield* _(
            pipe(
              RefM.modifyM_(ref, (m) => {
                const memo = m.get(a)
                if (memo) {
                  return I.succeed(tuple(memo, m))
                } else {
                  return I.gen(function* (_) {
                    const p = yield* _(P.make<E, B>())
                    yield* _(I.fork(to(p)(f(a))))
                    return tuple(p, m.set(a, p))
                  })
                }
              })
            )
          )
          return yield* _(promise.await)
        })
      )
    )
  )
}

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export function memoizeEq<A>(eq: Eq<A>) {
  return (
    /**
     * @trace 0
     */
    <R, E, B>(f: (a: A) => IO<R, E, B>): UIO<(a: A) => IO<R, E, B>> =>
      pipe(
        RefM.makeRefM(new Map<A, P.Promise<E, B>>()),
        I.map(
          traceAs(f, (ref) => (a: A) =>
            I.gen(function* (_) {
              const promise = yield* _(
                pipe(
                  RefM.modifyM_(ref, (m) => {
                    for (const [k, v] of m.entries()) {
                      if (eq.equals_(k, a)) {
                        return I.succeed(tuple(v, m))
                      }
                    }
                    return I.gen(function* (_) {
                      const p = yield* _(P.make<E, B>())
                      yield* _(I.fork(to(p)(f(a))))
                      return tuple(p, m.set(a, p))
                    })
                  })
                )
              )
              return yield* _(promise.await)
            })
          )
        )
      )
  )
}
