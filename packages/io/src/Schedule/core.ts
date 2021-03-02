import type { FIO, IO, UIO } from '../IO/core'
import type { Decision, StepFunction } from './Decision'
import type { Either } from '@principia/base/Either'
import type { Has } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'

import * as E from '@principia/base/Either'
import { NoSuchElementError } from '@principia/base/Error'
import { constant, pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import { Clock } from '../Clock'
import * as I from '../IO/core'
import * as Ref from '../IORef/core'
import { Random } from '../Random'
import { done, makeContinue, makeDone, toDone } from './Decision'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export class Schedule<R, I, O> {
  constructor(readonly step: StepFunction<R, I, O>) {}
  ['&&']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]> {
    return intersect_(this, that)
  }
  ['***']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, readonly [I, I1], readonly [O, O1]> {
    return intersectInOut_(this, that)
  }
  ['*>']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O1> {
    return intersectr_(this, that)
  }
  ['<*']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O> {
    return intersectl_(this, that)
  }
  ['+++']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, Either<I, I1>, O | O1> {
    return chooseMerge_(this, that)
  }
  ['++']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O | O1> {
    return andThen_(this, that)
  }
  ['<*>']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]> {
    return intersect_(this, that)
  }
  ['>>>']<R1, O1>(that: Schedule<R1, O, O1>): Schedule<R & R1, I, O1> {
    return compose_(this, that)
  }
  ['<<<']<R1, I1>(that: Schedule<R1, I1, I>): Schedule<R & R1, I1, O> {
    return compose_(that, this)
  }
  ['||']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]> {
    return union_(this, that)
  }
  ['|||']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, E.Either<I, I1>, O | O1> {
    return chooseMerge_(this, that)
  }
  ['<||>']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, Either<O, O1>> {
    return andThenEither_(this, that)
  }
  ['<$>']<O1>(f: (o: O) => O1): Schedule<R, I, O1> {
    return map_(this, f)
  }
}

export class Driver<R, I, O> {
  constructor(
    readonly next: (input: I) => IO<R, Option<never>, O>,
    readonly last: FIO<Error, O>,
    readonly reset: UIO<void>
  ) {}
}

/*
 * -------------------------------------------
 * Runtime
 * -------------------------------------------
 */

export function driver<R, I, O>(schedule: Schedule<R, I, O>): I.UIO<Driver<Has<Clock> & R, I, O>> {
  return pipe(
    Ref.make([O.None<O>(), schedule.step] as const),
    I.map((ref) => {
      const reset = ref.set([O.None(), schedule.step])

      const last = pipe(
        ref.get,
        I.bind(([o, _]) =>
          O.match_(
            o,
            () => I.fail(new NoSuchElementError('Driver.last')),
            (b) => I.pure(b)
          )
        )
      )

      const next = (input: I) =>
        I.gen(function* (_) {
          const step = yield* _(I.map_(ref.get, ([, o]) => o))
          const now  = yield* _(Clock.currentTime)
          const dec  = yield* _(step(now, input))
          switch (dec._tag) {
            case 'Done': {
              return yield* _(pipe(ref.set(tuple(O.Some(dec.out), done(dec.out))), I.apr(I.fail(O.None()))))
            }
            case 'Continue': {
              return yield* _(
                pipe(
                  ref.set(tuple(O.Some(dec.out), dec.next)),
                  I.as(() => dec.interval - now),
                  I.bind((s) => (s > 0 ? Clock.sleep(s) : I.unit())),
                  I.as(() => dec.out)
                )
              )
            }
          }
        })

      return new Driver(next, last, reset)
    })
  )
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function intersect_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, readonly [O, O1]> {
  return intersectWith_(sc, that, (d, d2) => Math.max(d, d2))
}

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function intersect<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, readonly [O, O1]> {
  return (sc) => intersect_(sc, that)
}

/**
 * Same as intersect but ignores the right output.
 */
export function intersectl_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, O> {
  return map_(intersect_(sc, that), ([_]) => _)
}

/**
 * Same as intersect but ignores the right output.
 */
export function intersectl<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O> {
  return (sc) => intersectl_(sc, that)
}

/**
 * Same as intersect but ignores the left output.
 */
export function intersectr_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, O1> {
  return map_(intersect_(sc, that), ([_, __]) => __)
}

/**
 * Same as intersect but ignores the left output.
 */
export function intersectr<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O1> {
  return (sc) => intersectr_(sc, that)
}

/**
 * Equivalent to `intersect` followed by `map`.
 */
export function intersectMap_<R, I, O, R1, I1, O1, O2>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>,
  f: (o: O, o1: O1) => O2
): Schedule<R & R1, I & I1, O2> {
  return map_(intersect_(sc, that), ([o, o1]) => f(o, o1))
}

/**
 * Equivalent to `intersect` followed by `map`.
 */
export function intersectMap<R1, I1, O, O1, O2>(
  that: Schedule<R1, I1, O1>,
  f: (o: O, o1: O1) => O2
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O2> {
  return (sc) => intersectMap_(sc, that, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

const mapMLoop = <R, I, O, R1, O1>(
  self: StepFunction<R, I, O>,
  f: (o: O) => I.IO<R1, never, O1>
): StepFunction<R & R1, I, O1> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.map_(f(d.out), (o): Decision<R & R1, I, O1> => makeDone(o))
      }
      case 'Continue': {
        return I.map_(f(d.out), (o) => makeContinue(o, d.interval, mapMLoop(d.next, f)))
      }
    }
  })

export function mapM_<R, I, O, R1, O1>(sc: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, O1>) {
  return new Schedule(mapMLoop(sc.step, (o) => f(o)))
}

export function mapM<R1, O, O1>(f: (o: O) => I.IO<R1, never, O1>) {
  return <R, I>(sc: Schedule<R, I, O>) => mapM_(sc, f)
}

export function map_<R, I, A, B>(fa: Schedule<R, I, A>, f: (a: A) => B): Schedule<R, I, B> {
  return mapM_(fa, (o) => I.pure(f(o)))
}

export function map<A, B>(f: (a: A) => B) {
  return <R, I>(fa: Schedule<R, I, A>): Schedule<R, I, B> => map_(fa, f)
}

export function as_<R, I, O, O1>(sc: Schedule<R, I, O>, o: O1) {
  return map_(sc, () => o)
}

export function as<O1>(o: O1) {
  return <R, I, O>(sc: Schedule<R, I, O>) => as_(sc, o)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

const giveAllLoop = <R, I, O>(self: StepFunction<R, I, O>, r: R): StepFunction<unknown, I, O> => (now, i) =>
  I.giveAll(r)(
    I.map_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return makeDone(d.out)
        }
        case 'Continue': {
          return makeContinue(d.out, d.interval, giveAllLoop(d.next, r))
        }
      }
    })
  )

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export function giveAll_<R, I, O>(sc: Schedule<R, I, O>, r: R): Schedule<unknown, I, O> {
  return new Schedule(giveAllLoop(sc.step, r))
}

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export function giveAll<R>(r: R): <I, O>(sc: Schedule<R, I, O>) => Schedule<unknown, I, O> {
  return (sc) => giveAll_(sc, r)
}

const givesLoop = <R, R1, I, O>(self: StepFunction<R, I, O>, r: (_: R1) => R): StepFunction<R1, I, O> => (now, i) =>
  I.gives_(
    I.map_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return makeDone(d.out)
        }
        case 'Continue': {
          return makeContinue(d.out, d.interval, givesLoop(d.next, r))
        }
      }
    }),
    r
  )

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export function gives_<R, R1, I, O>(sc: Schedule<R, I, O>, r: (_: R1) => R): Schedule<R1, I, O> {
  return new Schedule(givesLoop(sc.step, r))
}

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export function gives<R, R1>(r: (_: R1) => R): <I, O>(sc: Schedule<R, I, O>) => Schedule<R1, I, O> {
  return (sc) => gives_(sc, r)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 */
export function asUnit<R, I, O, R1>(sc: Schedule<R, I, O>): Schedule<R & R1, I, void> {
  return as<void>(undefined)(sc)
}

/*
 * -------------------------------------------
 * Schedules
 * -------------------------------------------
 */

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O) => I.IO<R1, never, number>
): Schedule<R & R1, I, O> {
  return modifyDelayM_(sc, (o, d) => I.map_(f(o), (i) => i + d))
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM<R1, O>(f: (o: O) => I.IO<R1, never, number>) {
  return <R, I>(sc: Schedule<R, I, O>): Schedule<R & R1, I, O> => addDelayM_(sc, f)
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => number) {
  return addDelayM_(sc, (o) => I.pure(f(o)))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay<O>(f: (o: O) => number) {
  return <R, I>(sc: Schedule<R, I, O>) => addDelay_(sc, f)
}

const andThenEitherLoop = <R, I, O, R1, I1, O1>(
  sc: StepFunction<R, I, O>,
  that: StepFunction<R1, I1, O1>,
  onLeft: boolean
): StepFunction<R & R1, I & I1, Either<O, O1>> => (now, i) =>
  onLeft
    ? I.bind_(sc(now, i), (d) => {
        switch (d._tag) {
          case 'Continue': {
            return I.pure(makeContinue(E.Left(d.out), d.interval, andThenEitherLoop(d.next, that, true)))
          }
          case 'Done': {
            return andThenEitherLoop(sc, that, false)(now, i)
          }
        }
      })
    : I.map_(that(now, i), (d) => {
        switch (d._tag) {
          case 'Done': {
            return makeDone(E.Right(d.out))
          }
          case 'Continue': {
            return makeContinue(E.Right(d.out), d.interval, andThenEitherLoop(sc, d.next, false))
          }
        }
      })

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function andThenEither_<R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) {
  return new Schedule(andThenEitherLoop(sc.step, that.step, true))
}

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function andThenEither<R1, I1, O1>(that: Schedule<R1, I1, O1>) {
  return <R, I, O>(sc: Schedule<R, I, O>) => andThenEither_(sc, that)
}

export function andThen_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, O | O1> {
  return map_(
    andThenEither_(sc, that),
    E.match(
      (o) => o,
      (o1) => o1
    )
  )
}

export function andThen<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O | O1> {
  return (sc) => andThen_(sc, that)
}

const intersectWithLoop = <R, I, O, R1, I1, O1>(
  sc: StepFunction<R, I, O>,
  that: StepFunction<R1, I1, O1>,
  f: (d1: number, d2: number) => number
): StepFunction<R & R1, I & I1, [O, O1]> => (now, i) => {
  const left  = sc(now, i)
  const right = that(now, i)

  return I.crossWith_(left, right, (l, r) => {
    switch (l._tag) {
      case 'Done': {
        switch (r._tag) {
          case 'Done': {
            return makeDone<[O, O1]>([l.out, r.out])
          }
          case 'Continue': {
            return makeDone<[O, O1]>([l.out, r.out])
          }
        }
      }
      /* eslint-disable-next-line no-fallthrough */
      case 'Continue': {
        switch (r._tag) {
          case 'Done': {
            return makeDone<[O, O1]>([l.out, r.out])
          }
          case 'Continue': {
            return makeContinue([l.out, r.out], f(l.interval, r.interval), intersectWithLoop(l.next, r.next, f))
          }
        }
      }
    }
  })
}

export function intersectWith_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>,
  f: (d1: number, d2: number) => number
): Schedule<R & R1, I & I1, readonly [O, O1]> {
  return new Schedule(intersectWithLoop(sc.step, that.step, f))
}

export function intersectWith<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): (
  f: (d1: number, d2: number) => number
) => <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, readonly [O, O1]> {
  return (f) => (sc) => intersectWith_(sc, that, f)
}

const checkMLoop = <R, I, O, R1>(
  self: StepFunction<R, I, O>,
  test: (i: I, o: O) => I.IO<R1, never, boolean>
): StepFunction<R & R1, I, O> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.pure(makeDone(d.out))
      }
      case 'Continue': {
        return I.map_(test(i, d.out), (b) =>
          b ? makeContinue(d.out, d.interval, checkMLoop(d.next, test)) : makeDone(d.out)
        )
      }
    }
  })

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function checkM_<R, I, O, R1>(sc: Schedule<R, I, O>, test: (i: I, o: O) => I.IO<R1, never, boolean>) {
  return new Schedule(checkMLoop(sc.step, test))
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function checkM<R1, I, O>(
  test: (i: I, o: O) => I.IO<R1, never, boolean>
): <R>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => checkM_(sc, test)
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function check_<R, I, O>(sc: Schedule<R, I, O>, test: (i: I, o: O) => boolean): Schedule<R, I, O> {
  return checkM_(sc, (i, o) => I.pure(test(i, o)))
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function check<I, O>(test: (i: I, o: O) => boolean): <R>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => check_(sc, test)
}

const chooseLoop = <R, I, O, R1, I1, O1>(
  sc: StepFunction<R, I, O>,
  that: StepFunction<R1, I1, O1>
): StepFunction<R & R1, Either<I, I1>, Either<O, O1>> => (now, either) =>
  E.match_(
    either,
    (i) =>
      I.map_(sc(now, i), (d) => {
        switch (d._tag) {
          case 'Done': {
            return makeDone(E.Left(d.out))
          }
          case 'Continue': {
            return makeContinue(E.Left(d.out), d.interval, chooseLoop(d.next, that))
          }
        }
      }),
    (i2) =>
      I.map_(that(now, i2), (d) => {
        switch (d._tag) {
          case 'Done': {
            return makeDone(E.Right(d.out))
          }
          case 'Continue': {
            return makeContinue(E.Right(d.out), d.interval, chooseLoop(sc, d.next))
          }
        }
      })
  )

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function choose_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, Either<I, I1>, Either<O, O1>> {
  return new Schedule(chooseLoop(sc.step, that.step))
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function choose<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, Either<I, I1>, Either<O, O1>> {
  return (sc) => choose_(sc, that)
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function chooseMerge_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, Either<I, I1>, O | O1> {
  return map_(choose_(sc, that), E.merge)
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function chooseMerge<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, Either<I, I1>, O1 | O> {
  return (sc) => chooseMerge_(sc, that)
}

/**
 * Returns a new schedule that collects the outputs of a `Schedule` into an array.
 */
export function collectAll<R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, readonly O[]> {
  return fold_(sc, [] as ReadonlyArray<O>, (xs, x) => [...xs, x])
}

function composeLoop<R, I, O, R1, O1>(
  s1: StepFunction<R, I, O>,
  s2: StepFunction<R1, O, O1>
): StepFunction<R & R1, I, O1> {
  return (now, i) =>
    pipe(
      s1(now, i),
      I.bind((d) => {
        switch (d._tag) {
          case 'Done': {
            return I.map_(s2(now, d.out), toDone)
          }
          case 'Continue': {
            return I.map_(s2(now, d.out), (d2) => {
              switch (d2._tag) {
                case 'Done': {
                  return makeDone(d2.out)
                }
                case 'Continue': {
                  return makeContinue(d2.out, Math.max(d.interval, d2.interval), composeLoop(d.next, d2.next))
                }
              }
            })
          }
        }
      })
    )
}

export function compose_<R, I, O, R1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, O, O1>): Schedule<R & R1, I, O1> {
  return new Schedule(composeLoop(sc.step, that.step))
}

export function compose<O, R1, O1>(
  that: Schedule<R1, O, O1>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O1> {
  return (sc) => compose_(sc, that)
}

/**
 * Returns a new `Schedule` with the specified effectfully computed delay added before the start
 * of each interval produced by the this `Schedule`.
 */
export function delayedM_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (d: number) => I.IO<R1, never, number>) {
  return modifyDelayM_(sc, (_, d) => f(d))
}

/**
 * Returns a new `Schedule` with the specified effectfully computed delay added before the start
 * of each interval produced by the this `Schedule`.
 */
export function delayedM<R1>(f: (d: number) => I.IO<R1, never, number>) {
  return <R, I, O>(sc: Schedule<R, I, O>) => delayedM_(sc, f)
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayed_<R, I, O>(sc: Schedule<R, I, O>, f: (d: number) => number) {
  return delayedM_(sc, (d) => I.pure(f(d)))
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayed(f: (d: number) => number) {
  return <R, I, O>(sc: Schedule<R, I, O>) => delayed_(sc, f)
}

export function duration(n: number) {
  return new Schedule((now, _: unknown) => I.pure(makeContinue(0, now + n, () => I.pure(makeDone(n)))))
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayedFrom<R, I>(sc: Schedule<R, I, number>) {
  return addDelay_(sc, (x) => x)
}

export function union_<R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) {
  return intersectWith_(sc, that, (d1, d2) => Math.min(d1, d2))
}

export function union<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, readonly [O, O1]> {
  return (sc) => union_(sc, that)
}

export function unionWith_<R, I, O, R1, I1, O1, O2>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>,
  f: (o: O, o1: O1) => O2
): Schedule<R & R1, I & I1, O2> {
  return map_(union_(sc, that), ([o, o1]) => f(o, o1))
}

export function unionWith<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <O, O2>(f: (o: O, o1: O1) => O2) => <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O2> {
  return (f) => (sc) => unionWith_(sc, that, f)
}

const ensuringLoop = <R, I, O, R1>(
  self: StepFunction<R, I, O>,
  finalizer: I.IO<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.as_(finalizer, () => makeDone(d.out))
      }
      case 'Continue': {
        return I.pure(makeContinue(d.out, d.interval, ensuringLoop(d.next, finalizer)))
      }
    }
  })

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `IO#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export function ensuring_<R, I, O, R1>(sc: Schedule<R, I, O>, finalizer: I.IO<R1, never, any>): Schedule<R & R1, I, O> {
  return new Schedule(ensuringLoop(sc.step, finalizer))
}

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `IO#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export function ensuring<R1>(
  finalizer: I.IO<R1, never, any>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => ensuring_(sc, finalizer)
}

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * <pre>
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * </pre>
 */
export function fixed(interval: number): Schedule<unknown, unknown, number> {
  type State = { startMillis: number, lastRun: number }

  const loop = (startMillis: Option<State>, n: number): StepFunction<unknown, unknown, number> => (now, _) =>
    I.pure(
      O.match_(
        startMillis,
        () => makeContinue(n + 1, now + interval, loop(O.Some({ startMillis: now, lastRun: now }), n + 1)),
        ({ lastRun, startMillis }) => {
          const runningBehind = now > lastRun + interval
          const boundary      = interval === 0 ? interval : interval - ((now - startMillis) % interval)
          const sleepTime     = boundary === 0 ? interval : boundary
          const nextRun       = runningBehind ? now : now + sleepTime

          return makeContinue(
            n + 1,
            nextRun,
            loop(
              O.Some<State>({ startMillis, lastRun: nextRun }),
              n + 1
            )
          )
        }
      )
    )

  return new Schedule(loop(O.None(), 0))
}

const foldMLoop = <R, I, O, R1, B>(
  sf: StepFunction<R, I, O>,
  b: B,
  f: (b: B, o: O) => I.IO<R1, never, B>
): StepFunction<R & R1, I, B> => (now, i) =>
  I.bind_(sf(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.pure<Decision<R & R1, I, B>>(makeDone(b))
      }
      case 'Continue': {
        return I.map_(f(b, d.out), (b2) => makeContinue(b2, d.interval, foldMLoop(d.next, b2, f)))
      }
    }
  })

/**
 * Returns a new `Schedule` that effectfully folds over the outputs of a `Schedule`.
 */
export function foldM_<R, I, O, R1, B>(
  sc: Schedule<R, I, O>,
  b: B,
  f: (b: B, o: O) => I.IO<R1, never, B>
): Schedule<R & R1, I, B> {
  return new Schedule(foldMLoop(sc.step, b, f))
}

/**
 * Returns a new `Schedule` that effectfully folds over the outputs of a `Schedule`.
 */
export function foldM<R1, O, B>(
  b: B,
  f: (b: B, o: O) => I.IO<R1, never, B>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, B> {
  return (sc) => foldM_(sc, b, f)
}

/**
 * Returns a new `Schedule` that folds over the outputs of a `Schedule`.
 */
export function fold_<R, I, O, B>(sc: Schedule<R, I, O>, b: B, f: (b: B, o: O) => B): Schedule<R, I, B> {
  return foldM_(sc, b, (b, o) => I.pure(f(b, o)))
}

/**
 * Returns a new `Schedule` that folds over the outputs of a `Schedule`.
 */
export function fold<O, B>(b: B, f: (b: B, o: O) => B): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, B> {
  return (sc) => fold_(sc, b, f)
}

/**
 * Returns a new schedule that packs the input and output of this schedule into the first
 * element of a tuple. This allows carrying information through this schedule.
 */
export function fst<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, readonly [I, A], readonly [O, A]> {
  return (sc) => intersectInOut_(sc, identity<A>())
}

/**
 * A schedule that always recurs, mapping input values through the
 * specified function.
 */
export function fromFunction<A, B>(f: (a: A) => B): Schedule<unknown, A, B> {
  return map_(identity<A>(), f)
}

/**
 * A schedule that recurs forever and produces a count of repeats.
 */
export const forever = unfold_(constant(0), (n) => n + 1)

const identityLoop = <A>(): StepFunction<unknown, A, A> => (now, i) => I.pure(makeContinue(i, now, identityLoop()))

/**
 * A schedule that always recurs and returns inputs as outputs.
 */
export function identity<A>(): Schedule<unknown, A, A> {
  return new Schedule(identityLoop<A>())
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export function jittered_<R, I, O>(
  sc: Schedule<R, I, O>,
  { max = 0.1, min = 0 }: { min?: number, max?: number } = {}
): Schedule<R & Has<Random>, I, O> {
  return delayedM_(sc, (d) => I.map_(Random.nextDouble, (r) => d * min * (1 - r) + d * max * r))
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export function jittered({ max = 0.1, min = 0 }: { min?: number, max?: number } = {}): <R, I, O>(
  sc: Schedule<R, I, O>
) => Schedule<R & Has<Random>, I, O> {
  return (sc) => jittered_(sc, { min, max })
}

/**
 * A schedule that always recurs, but will repeat on a linear time
 * interval, given by `base * n` where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export function linear(base: number): Schedule<unknown, unknown, number> {
  return delayedFrom(map_(forever, (i) => base * (i + 1)))
}

/**
 * Returns a new schedule that makes this schedule available on the `Left` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export function left<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, Either<I, A>, Either<O, A>> {
  return (sc) => choose_(sc, identity<A>())
}

const repeatLoop = <R, I, O>(
  init: StepFunction<R, I, O>,
  self: StepFunction<R, I, O> = init
): StepFunction<R, I, O> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return repeatLoop(init, self)(now, i)
      }
      case 'Continue': {
        return I.pure(makeContinue(d.out, d.interval, repeatLoop(init, d.next)))
      }
    }
  })

/**
 * Returns a new schedule that loops this one continuously, resetting the state
 * when this schedule is done.
 */
export function repeat<R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, O> {
  return new Schedule(repeatLoop(sc.step))
}

/**
 * Returns a new schedule that makes this schedule available on the `Right` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export function right<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, Either<A, I>, Either<A, O>> {
  return (sc) => choose_(identity<A>(), sc)
}

const modifyDelayMLoop = <R, I, O, R1>(
  sf: StepFunction<R, I, O>,
  f: (o: O, d: number) => I.IO<R1, never, number>
): StepFunction<R & R1, I, O> => (now, i) =>
  I.bind_(sf(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.pure<Decision<R & R1, I, O>>(makeDone(d.out))
      }
      case 'Continue': {
        const delay = d.interval - now

        return I.map_(f(d.out, delay), (duration) => makeContinue(d.out, now + duration, modifyDelayMLoop(d.next, f)))
      }
    }
  })

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayM_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O, d: number) => I.IO<R1, never, number>
): Schedule<R & R1, I, O> {
  return new Schedule(modifyDelayMLoop(sc.step, f))
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayM<R1, O>(f: (o: O, d: number) => I.IO<R1, never, number>) {
  return <R, I>(sc: Schedule<R, I, O>): Schedule<R & R1, I, O> => modifyDelayM_(sc, f)
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 */
export function modifyDelay_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O, d: number) => number): Schedule<R, I, O> {
  return modifyDelayM_(sc, (o, d) => I.pure(f(o, d)))
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 */
export function modifyDelay<O>(f: (o: O, d: number) => number) {
  return <R, I>(sc: Schedule<R, I, O>): Schedule<R, I, O> => modifyDelay_(sc, f)
}

const onDecisionLoop = <R, I, O, R1>(
  self: StepFunction<R, I, O>,
  f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.as_(f(d), () => makeDone(d.out))
      }
      case 'Continue': {
        return I.as_(f(d), () => makeContinue(d.out, d.interval, onDecisionLoop(d.next, f)))
      }
    }
  })

/**
 * A `Schedule` that recurs one time.
 */
export const once = asUnit(recur(1))

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
): Schedule<R & R1, I, O> {
  return new Schedule(onDecisionLoop(sc.step, f))
}

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision<R, I, O, R1>(
  f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
): (sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => onDecision_(sc, f)
}

/**
 * A schedule spanning all time, which can be stepped only the specified number of times before
 * it terminates.
 */
export function recur(n: number): Schedule<unknown, unknown, number> {
  return whileOutput_(forever, (x) => x < n)
}

const reconsiderMLoop = <R, I, O, R1, O1>(
  self: StepFunction<R, I, O>,
  f: (_: Decision<R, I, O>) => I.IO<R1, never, E.Either<O1, readonly [O1, number]>>
): StepFunction<R & R1, I, O1> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.map_(
          f(d),
          E.match(
            (o2) => makeDone(o2),
            ([o2]) => makeDone(o2)
          )
        )
      }
      case 'Continue': {
        return I.map_(
          f(d),
          E.match(
            (o2) => makeDone(o2),
            ([o2, int]) => makeContinue(o2, int, reconsiderMLoop(d.next, f))
          )
        )
      }
    }
  })

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsiderM_<R, I, O, R1, O1>(
  sc: Schedule<R, I, O>,
  f: (d: Decision<R, I, O>) => I.IO<R1, never, Either<O1, readonly [O1, number]>>
): Schedule<R & R1, I, O1> {
  return new Schedule(reconsiderMLoop(sc.step, f))
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsiderM<R, I, O, R1, O1>(
  f: (d: Decision<R, I, O>) => I.IO<R1, never, Either<O1, readonly [O1, number]>>
): (sc: Schedule<R, I, O>) => Schedule<R & R1, I, O1> {
  return (sc) => reconsiderM_(sc, f)
}

/**
 * Returns a new schedule that reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsider_<R, I, O, O1>(
  sc: Schedule<R, I, O>,
  f: (d: Decision<R, I, O>) => Either<O1, readonly [O1, number]>
): Schedule<R, I, O1> {
  return reconsiderM_(sc, (d) => I.pure(f(d)))
}

/**
 * Returns a new schedule that reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsider<R, I, O, O1>(
  f: (d: Decision<R, I, O>) => Either<O1, readonly [O1, number]>
): (sc: Schedule<R, I, O>) => Schedule<R, I, O1> {
  return (sc) => reconsider_(sc, f)
}

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to true.
 */
export function recurWhileM<R, A>(f: (a: A) => I.IO<R, never, boolean>): Schedule<R, A, A> {
  return whileInputM_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurWhile<A>(f: (a: A) => boolean): Schedule<unknown, A, A> {
  return whileInput_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurWhileEqual<A>(a: A): Schedule<unknown, A, A> {
  return whileInput_(identity<A>(), (x) => a === x)
}

/**
 * A schedule that recurs until the effectful predicate evaluates to true.
 */
export function recurUntilM<R, A>(f: (a: A) => I.IO<R, never, boolean>): Schedule<R, A, A> {
  return untilInputM_(identity<A>(), f)
}

/**
 * A schedule that recurs until the predicate evaluates to true.
 */
export function recurUntil<A>(f: (a: A) => boolean): Schedule<unknown, A, A> {
  return untilInput_(identity<A>(), f)
}

/**
 * A schedule that recurs until the predicate evaluates to true.
 */
export function recurUntilEqual<A>(a: A): Schedule<unknown, A, A> {
  return untilInput_(identity<A>(), (x) => x === a)
}

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 */
export function repetitions<R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, number> {
  return fold_(sc, 0, (n) => n + 1)
}

const resetWhenLoop = <R, I, O>(
  sc: Schedule<R, I, O>,
  step: StepFunction<R, I, O>,
  f: (o: O) => boolean
): StepFunction<R, I, O> => (now, i) =>
  I.bind_(step(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return f(d.out) ? sc.step(now, i) : I.pure(makeDone(d.out))
      }
      case 'Continue': {
        return f(d.out) ? sc.step(now, i) : I.pure(makeContinue(d.out, d.interval, resetWhenLoop(sc, d.next, f)))
      }
    }
  })

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export function resetWhen_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O> {
  return new Schedule(resetWhenLoop(sc, sc.step, f))
}

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export function resetWhen<O>(f: (o: O) => boolean): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => resetWhen_(sc, f)
}

const runLoop = <R, I, O>(
  self: StepFunction<R, I, O>,
  now: number,
  xs: readonly I[],
  acc: readonly O[]
): I.IO<R, never, readonly O[]> =>
  xs.length > 0
    ? I.bind_(self(now, xs[0]), (d) => {
        switch (d._tag) {
          case 'Done': {
            return I.pure([...acc, d.out])
          }
          case 'Continue': {
            return runLoop(d.next, d.interval, xs, [...acc, d.out])
          }
        }
      })
    : I.pure(acc)

export function run_<R, I, O>(sc: Schedule<R, I, O>, now: number, i: Iterable<I>): I.IO<R, never, readonly O[]> {
  return runLoop(sc.step, now, Array.from(i), [])
}

export function run<I>(now: number, i: Iterable<I>): <R, O>(sc: Schedule<R, I, O>) => I.IO<R, never, readonly O[]> {
  return (sc) => run_(sc, now, i)
}

/**
 * A `Schedule` that stops
 */
export const stop = asUnit(recur(0))

/**
 * Returns a new schedule that packs the input and output of this schedule into the second
 * element of a tuple. This allows carrying information through this schedule.
 */
export function snd<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, readonly [A, I], readonly [A, O]> {
  return (sc) => intersectInOut_(identity<A>(), sc)
}

/**
 * Returns a schedule that recurs continuously, each repetition spaced the specified duration
 * from the last run.
 */
export const spaced = (duration: number) => addDelay_(forever, () => duration)

const tapInputLoop = <R, I, O, R1>(
  self: StepFunction<R, I, O>,
  f: (i: I) => I.IO<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
  I.bind_(f(i), () =>
    I.map_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return makeDone(d.out)
        }
        case 'Continue': {
          return makeContinue(d.out, d.interval, tapInputLoop(d.next, f))
        }
      }
    })
  )

export function tapInput_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (i: I) => I.IO<R1, never, any>
): Schedule<R & R1, I, O> {
  return new Schedule(tapInputLoop(sc.step, f))
}

export function tapInput<R1, I>(
  f: (i: I) => I.IO<R1, never, any>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => tapInput_(sc, f)
}

const tapOutputLoop = <R, I, O, R1>(
  self: StepFunction<R, I, O>,
  f: (o: O) => I.IO<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
  I.bind_(self(now, i), (d) => {
    switch (d._tag) {
      case 'Done': {
        return I.as_(f(d.out), () => makeDone(d.out))
      }
      case 'Continue': {
        return I.as_(f(d.out), () => makeContinue(d.out, d.interval, tapOutputLoop(d.next, f)))
      }
    }
  })

export function tapOutput_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O) => I.IO<R1, never, any>
): Schedule<R & R1, I, O> {
  return new Schedule(tapOutputLoop(sc.step, f))
}

export function tapOutput<R1, O>(
  f: (o: O) => I.IO<R1, never, any>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => tapOutput_(sc, f)
}

const zipLoop = <R, I, O, R1, I1, O1>(
  sc: StepFunction<R, I, O>,
  that: StepFunction<R1, I1, O1>
): StepFunction<R & R1, readonly [I, I1], readonly [O, O1]> => (now, [in1, in2]) =>
  I.map_(I.cross_(sc(now, in1), that(now, in2)), ([d1, d2]) => {
    switch (d1._tag) {
      case 'Done': {
        switch (d2._tag) {
          case 'Done': {
            return makeDone(tuple(d1.out, d2.out))
          }
          case 'Continue': {
            return makeDone(tuple(d1.out, d2.out))
          }
        }
      }
      /* eslint-disable-next-line no-fallthrough */
      case 'Continue': {
        switch (d2._tag) {
          case 'Done': {
            return makeDone(tuple(d1.out, d2.out))
          }
          case 'Continue': {
            return makeContinue(tuple(d1.out, d2.out), Math.min(d1.interval, d2.interval), zipLoop(d1.next, d2.next))
          }
        }
      }
    }
  })

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function intersectInOut_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, readonly [I, I1], readonly [O, O1]> {
  return new Schedule(zipLoop(sc.step, that.step))
}

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function intersectInOut<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, readonly [I, I1], readonly [O, O1]> {
  return (sc) => intersectInOut_(sc, that)
}
const unfoldLoop = <A>(a: A, f: (a: A) => A): StepFunction<unknown, unknown, A> => (now, _) =>
  I.pure(makeContinue(a, now, unfoldLoop(f(a), f)))

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold_<A>(a: () => A, f: (a: A) => A): Schedule<unknown, unknown, A> {
  return new Schedule((now) =>
    pipe(
      I.effectTotal(a),
      I.map((a) => makeContinue(a, now, unfoldLoop(f(a), f)))
    )
  )
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold<A>(f: (a: A) => A): (a: () => A) => Schedule<unknown, unknown, A> {
  return (a) => unfold_(a, f)
}

const unfoldMLoop = <R, A>(a: A, f: (a: A) => I.IO<R, never, A>): StepFunction<R, unknown, A> => (now, _) =>
  I.pure(makeContinue(a, now, (n, i) => I.bind_(f(a), (x) => unfoldMLoop(x, f)(n, i))))

/**
 * Effectfully unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldM_<R, A>(a: A, f: (a: A) => I.IO<R, never, A>): Schedule<R, unknown, A> {
  return new Schedule(unfoldMLoop(a, f))
}

/**
 * Effectfully unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldM<R, A>(f: (a: A) => I.IO<R, never, A>): (a: A) => Schedule<R, unknown, A> {
  return (a) => unfoldM_(a, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInput_<R, I, O>(sc: Schedule<R, I, O>, f: (i: I) => boolean): Schedule<R, I, O> {
  return check_(sc, (i) => !f(i))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInput<I>(f: (i: I) => boolean): <R, O>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => untilInput_(sc, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInputM_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, boolean>) {
  return checkM_(sc, (i) => I.map_(f(i), (b) => !b))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInputM<R1, I>(
  f: (i: I) => I.IO<R1, never, boolean>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => untilInputM_(sc, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutput_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O> {
  return check_(sc, (_, o) => !f(o))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutput<O>(f: (o: O) => boolean): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => untilOutput_(sc, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutputM_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, boolean>) {
  return checkM_(sc, (_, o) => I.map_(f(o), (b) => !b))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutputM<R1, O>(
  f: (o: O) => I.IO<R1, never, boolean>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => untilOutputM_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInput_<R, I, O>(sc: Schedule<R, I, O>, f: (i: I) => boolean): Schedule<R, I, O> {
  return check_(sc, (i) => f(i))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInput<I>(f: (i: I) => boolean): <R, O>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => whileInput_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInputM_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, boolean>) {
  return checkM_(sc, (i) => f(i))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInputM<R1, I>(
  f: (i: I) => I.IO<R1, never, boolean>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => whileInputM_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutput_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O> {
  return check_(sc, (_, o) => f(o))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutput<O>(f: (o: O) => boolean): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => whileOutput_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutputM_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O) => I.IO<R1, never, boolean>
): Schedule<R & R1, I, O> {
  return checkM_(sc, (_, o) => f(o))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutputM<R1, O>(
  f: (o: O) => I.IO<R1, never, boolean>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => whileOutputM_(sc, f)
}

const windowedLoop = (
  interval: number,
  startMillis: Option<number>,
  n: number
): StepFunction<unknown, unknown, number> => (now, _) =>
  I.pure(
    O.match_(
      startMillis,
      () => makeContinue(n + 1, now + interval, windowedLoop(interval, O.Some(now), n + 1)),
      (startMillis) =>
        makeContinue(n + 1, now + ((now - startMillis) % interval), windowedLoop(interval, O.Some(startMillis), n + 1))
    )
  )

export function windowed(interval: number): Schedule<unknown, unknown, number> {
  return new Schedule(windowedLoop(interval, O.None(), 0))
}
