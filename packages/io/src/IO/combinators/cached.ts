import type { Promise } from '../../Promise'
import type { FIO, IO, URIO } from '../core'
import type { Has } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'

import { RuntimeException } from '@principia/base/Exception'
import { pipe, tuple } from '@principia/base/function'
import * as O from '@principia/base/Option'

import { Clock } from '../../Clock'
import * as RefM from '../../IORefM'
import * as P from '../../Promise'
import * as I from '../core'
import { uninterruptibleMask } from './interrupt'
import { to } from './to'

const _compute = <R, E, A>(fa: IO<R, E, A>, ttl: number, start: number) =>
  I.gen(function* (_) {
    const p = yield* _(P.make<E, A>())
    yield* _(to(p)(fa))
    return O.Some(tuple(start + ttl, p))
  })

const _get = <R, E, A>(fa: IO<R, E, A>, ttl: number, cache: RefM.URefM<Option<readonly [number, Promise<E, A>]>>) =>
  uninterruptibleMask(({ restore }) =>
    pipe(
      Clock.currentTime,
      I.bind((time) =>
        pipe(
          cache,
          RefM.updateSomeAndGet((o) =>
            pipe(
              o,
              O.match(
                () => O.Some(_compute(fa, ttl, time)),
                ([end]) =>
                  end - time <= 0
                    ? O.Some(_compute(fa, ttl, time))
                    : O.None<IO<R, never, Option<readonly [number, P.Promise<E, A>]>>>()
              )
            )
          ),
          I.bind((a) => (a._tag === 'None' ? I.die(new RuntimeException('bug')) : restore(a.value[1].await)))
        )
      )
    )
  )

/**
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function cached_<R, E, A>(ma: IO<R, E, A>, timeToLive: number): URIO<R & Has<Clock>, FIO<E, A>> {
  return I.gen(function* (_) {
    const r     = yield* _(I.ask<R & Has<Clock>>())
    const cache = yield* _(RefM.make<Option<readonly [number, Promise<E, A>]>>(O.None()))
    return I.giveAll(r)(_get(ma, timeToLive, cache))
  })
}

/**
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function cached(timeToLive: number): <R, E, A>(ma: I.IO<R, E, A>) => URIO<R & Has<Clock>, FIO<E, A>> {
  return <R, E, A>(ma: IO<R, E, A>) => cached_(ma, timeToLive)
}
