// tracing: off

import type { Promise } from '../../Promise'
import type { FIO, IO, UIO, URIO } from '../core'
import type { Has } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'

import { RuntimeException } from '@principia/base/Exception'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'
import { accessCallTrace, traceCall } from '@principia/compile/util'

import { Clock } from '../../Clock'
import * as P from '../../Promise'
import * as Ref from '../../Ref'
import * as I from '../core'
import { uninterruptibleMask } from './interrupt'
import { to } from './to'

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @trace call
 */
export function cachedInvalidate_<R, E, A>(
  ma: IO<R, E, A>,
  timeToLive: number
): URIO<R & Has<Clock>, readonly [FIO<E, A>, UIO<void>]> {
  return I.gen(function* (_) {
    const r     = yield* _(I.ask<R & Has<Clock>>())
    const cache = yield* _(Ref.makeRefM<Option<readonly [number, Promise<E, A>]>>(O.None()))
    return tuple(I.giveAll_(_get(ma, timeToLive, cache), r), _invalidate(cache))
  })
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @dataFirst cachedInvalidate_
 * @trace call
 */
export function cachedInvalidate(
  timeToLive: number
): <R, E, A>(ma: IO<R, E, A>) => URIO<R & Has<Clock>, readonly [FIO<E, A>, UIO<void>]> {
  return (ma) => cachedInvalidate_(ma, timeToLive)
}

/**
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function cached_<R, E, A>(ma: IO<R, E, A>, timeToLive: number): URIO<R & Has<Clock>, FIO<E, A>> {
  const trace = accessCallTrace()
  return I.map_(traceCall(cachedInvalidate_, trace)(ma, timeToLive), ([_]) => _)
}

/**
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function cached(timeToLive: number): <R, E, A>(ma: I.IO<R, E, A>) => URIO<R & Has<Clock>, FIO<E, A>> {
  const trace = accessCallTrace()
  return traceCall((ma) => cached_(ma, timeToLive), trace)
}

function _compute<R, E, A>(fa: IO<R, E, A>, ttl: number, start: number) {
  return I.gen(function* (_) {
    const p = yield* _(P.make<E, A>())
    yield* _(to(p)(fa))
    return O.Some(tuple(start + ttl, p))
  })
}

function _get<R, E, A>(fa: IO<R, E, A>, ttl: number, cache: Ref.URefM<Option<readonly [number, Promise<E, A>]>>) {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      Clock.currentTime,
      I.bind((time) =>
        pipe(
          cache,
          Ref.updateSomeAndGetM((o) =>
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
}

function _invalidate<E, A>(cache: Ref.URefM<Option<readonly [number, Promise<E, A>]>>): UIO<void> {
  return cache.set(O.None())
}

