import type { Predicate } from '@principia/base/Function'
import type { Option } from '@principia/base/Option'
import type { IO } from '@principia/io/IO'
import type { Stream } from '@principia/io/Stream'

import { pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as Ca from '@principia/io/Cause'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as S from '@principia/io/Stream'

export class Sample<R, A> {
  constructor(readonly value: A, readonly shrink: Stream<R, never, Sample<R, A>>) {}
}

export function map_<R, A, B>(ma: Sample<R, A>, f: (a: A) => B): Sample<R, B> {
  return new Sample(
    f(ma.value),
    S.map_(ma.shrink, (s) => map_(s, f))
  )
}

export function map<A, B>(f: (a: A) => B): <R>(ma: Sample<R, A>) => Sample<R, B> {
  return (ma) => map_(ma, f)
}

export function bind_<R, A, R1, B>(ma: Sample<R, A>, f: (a: A) => Sample<R1, B>): Sample<R & R1, B> {
  const sample = f(ma.value)
  return new Sample(
    sample.value,
    S.concat_(
      sample.shrink,
      S.map_(ma.shrink, (s) => bind_(s, f))
    )
  )
}

export function bind<A, R1, B>(f: (a: A) => Sample<R1, B>): <R>(ma: Sample<R, A>) => Sample<R & R1, B> {
  return (ma) => bind_(ma, f)
}

export function shrinkSearch_<R, A>(ma: Sample<R, A>, f: Predicate<A>): Stream<R, never, A> {
  if (!f(ma.value)) {
    return S.fromChunk([ma.value])
  } else {
    return pipe(
      S.fromChunk([ma.value]),
      S.concat(
        pipe(
          ma.shrink,
          S.takeUntil((v) => f(v.value)),
          S.bind((s) => shrinkSearch_(s, f))
        )
      )
    )
  }
}

export function shrinkSearch<A>(f: Predicate<A>): <R>(ma: Sample<R, A>) => Stream<R, never, A> {
  return (ma) => shrinkSearch_(ma, f)
}

export function foreach_<R, A, R1, B>(
  ma: Sample<R, A>,
  f: (a: A) => IO<R1, never, B>
): IO<R & R1, never, Sample<R & R1, B>> {
  return pipe(
    f(ma.value),
    I.map(
      (b) =>
        new Sample(
          b,
          S.mapM_(ma.shrink, (s) => foreach_(s, f))
        )
    )
  )
}

export function foreach<A, R1, B>(
  f: (a: A) => IO<R1, never, B>
): <R>(ma: Sample<R, A>) => IO<R & R1, never, Sample<R & R1, B>> {
  return (ma) => foreach_(ma, f)
}

export function crossWith_<R, A, R1, B, C>(
  ma: Sample<R, A>,
  mb: Sample<R1, B>,
  f: (a: A, b: B) => C
): Sample<R & R1, C> {
  return pipe(
    ma,
    bind((a) => map_(mb, (b) => f(a, b)))
  )
}

export function crossWith<A, R1, B, C>(
  mb: Sample<R1, B>,
  f: (a: A, b: B) => C
): <R>(ma: Sample<R, A>) => Sample<R & R1, C> {
  return (ma) => crossWith_(ma, mb, f)
}

export function cross_<R, A, R1, B>(ma: Sample<R, A>, mb: Sample<R1, B>): Sample<R & R1, readonly [A, B]> {
  return crossWith_(ma, mb, tuple)
}

export function cross<R1, B>(mb: Sample<R1, B>): <R, A>(ma: Sample<R, A>) => Sample<R & R1, readonly [A, B]> {
  return (ma) => cross_(ma, mb)
}

export function filter_<R, A>(ma: Sample<R, A>, f: Predicate<A>): Stream<R, never, Sample<R, A>> {
  if (f(ma.value)) {
    return S.fromChunk([
      new Sample(
        ma.value,
        pipe(
          ma.shrink,
          S.bind((s) => filter_(s, f))
        )
      )
    ])
  } else {
    return pipe(
      ma.shrink,
      S.bind((s) => filter_(s, f))
    )
  }
}

export function filter<A>(f: Predicate<A>): <R>(ma: Sample<R, A>) => Stream<R, never, Sample<R, A>> {
  return (ma) => filter_(ma, f)
}

export function zipWith_<R, A, R1, B, C>(ma: Sample<R, A>, mb: Sample<R1, B>, f: (a: A, b: B) => C): Sample<R & R1, C> {
  type State = readonly [boolean, boolean, Option<Sample<R, A>>, Option<Sample<R1, B>>]
  const value  = f(ma.value, mb.value)
  const shrink = S.combine_(
    ma.shrink,
    mb.shrink,
    <State>[false, false, O.none(), O.none()],
    ([leftDone, rightDone, s1, s2], left, right) =>
      pipe(
        I.result(left),
        I.map2(I.result(right), (ea, eb) => {
          return ea._tag === 'Success'
            ? eb._tag === 'Success'
              ? Ex.succeed(
                  tuple(zipWith_(ea.value, eb.value, f), tuple(leftDone, rightDone, O.some(ea.value), O.some(eb.value)))
                )
              : pipe(
                  eb.cause,
                  Ca.sequenceCauseOption,
                  O.fold(
                    () =>
                      O.fold_(
                        s2,
                        () =>
                          Ex.succeed(
                            tuple(
                              map_(ea.value, (a) => f(a, mb.value)),
                              tuple(leftDone, true, O.some(ea.value), s2)
                            )
                          ),
                        (r) =>
                          Ex.succeed(tuple(zipWith_(ea.value, r, f), tuple(leftDone, rightDone, O.some(ea.value), s2)))
                      ),
                    (cause) => Ex.halt(cause)
                  )
                )
            : eb._tag === 'Success'
            ? pipe(
                ea.cause,
                Ca.sequenceCauseOption,
                O.fold(
                  () =>
                    O.fold_(
                      s1,
                      () =>
                        Ex.succeed(
                          tuple(
                            map_(eb.value, (b) => f(ma.value, b)),
                            tuple(true, rightDone, s1, O.some(eb.value))
                          )
                        ),
                      (l) =>
                        Ex.succeed(tuple(zipWith_(l, eb.value, f), tuple(leftDone, rightDone, s1, O.some(eb.value))))
                    ),
                  (cause) => Ex.halt(cause)
                )
              )
            : (() => {
                const causeL = Ca.sequenceCauseOption(ea.cause)
                const causeR = Ca.sequenceCauseOption(eb.cause)
                return causeL._tag === 'Some'
                  ? causeR._tag === 'Some'
                    ? Ex.halt(Ca.both(causeL.value, causeR.value))
                    : Ex.halt(causeL.value)
                  : causeR._tag === 'Some'
                  ? Ex.halt(causeR.value)
                  : (() => {
                      if (!leftDone && s2._tag === 'Some') {
                        return Ex.succeed(
                          tuple(
                            map_(s2.value, (b) => f(ma.value, b)),
                            tuple(true, rightDone, s1, s2)
                          )
                        )
                      } else if (!rightDone && s1._tag === 'Some') {
                        return Ex.succeed(
                          tuple(
                            map_(s1.value, (a) => f(a, mb.value)),
                            tuple(leftDone, true, O.none(), s2)
                          )
                        )
                      } else {
                        return Ex.fail(O.none())
                      }
                    })()
              })()
        })
      )
  )
  return new Sample(value, shrink)
}

export function zipWith<A, R1, B, C>(
  mb: Sample<R1, B>,
  f: (a: A, b: B) => C
): <R>(ma: Sample<R, A>) => Sample<R & R1, C> {
  return (ma) => zipWith_(ma, mb, f)
}

export function zip_<R, A, R1, B>(ma: Sample<R, A>, mb: Sample<R1, B>): Sample<R & R1, readonly [A, B]> {
  return zipWith_(ma, mb, tuple)
}

export function zip<R1, B>(mb: Sample<R1, B>): <R, A>(ma: Sample<R, A>) => Sample<R & R1, readonly [A, B]> {
  return (ma) => zip_(ma, mb)
}

export function noShrink<A>(a: A): Sample<unknown, A> {
  return new Sample(a, S.empty)
}

export function shrinkFractional(smallest: number): (a: number) => Sample<unknown, number> {
  return (a) => unfold(a, (max) =>
    tuple(
      max,
      S.unfold(smallest, (min) => {
        const mid = min + (max - min) / 2
        if (mid === max) {
          return O.none()
        } else if (Math.abs(max - mid) < 0.001) {
          return O.some([min, max])
        } else {
          return O.some([mid, mid])
        }
      })
    )
  )
}

function quot(x: number, y: number): number {
  return (x / y) | 0
}

export function shrinkIntegral(smallest: number): (a: number) => Sample<unknown, number> {
  return (a) =>
    unfold(a, (max) =>
      tuple(
        max,
        S.unfold(smallest, (min) => {
          const mid = min + (quot(max - min, 2))
          if(mid === max) {
            return O.none()
          } else if(Math.abs(max - mid) === 1) {
            return O.some([mid, max])
          } else {
            return O.some([mid, mid])
          }
        })
      )
    )
}

export function unfold<R, A, S>(s: S, f: (s: S) => readonly [A, Stream<R, never, S>]): Sample<R, A> {
  const [value, shrink] = f(s)
  return new Sample(
    value,
    pipe(
      shrink,
      S.map((s) => unfold(s, f))
    )
  )
}
