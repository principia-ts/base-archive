import type { Annotations } from '../Annotation'
import type { Live } from './Live'
import type { Has } from '@principia/base/Has'
import type { HashMap } from '@principia/base/HashMap'
import type { HashSet } from '@principia/base/HashSet'
import type { List } from '@principia/base/List'
import type { Clock } from '@principia/io/Clock'
import type { Fiber, FiberId, FiberStatus, RuntimeFiber } from '@principia/io/Fiber'
import type { IO, UIO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'
import type { URefM } from '@principia/io/IORefM'
import type { Layer } from '@principia/io/Layer'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, pipe, tuple } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import * as HM from '@principia/base/HashMap'
import * as HS from '@principia/base/HashSet'
import * as Li from '@principia/base/List'
import * as N from '@principia/base/Number'
import * as O from '@principia/base/Option'
import * as Ord from '@principia/base/Ord'
import { matchTag } from '@principia/base/util/matchers'
import { ClockTag, ProxyClock } from '@principia/io/Clock'
import { Console } from '@principia/io/Console'
import { eqFiberId } from '@principia/io/Fiber'
import * as Fi from '@principia/io/Fiber'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as RefM from '@principia/io/IORefM'
import * as L from '@principia/io/Layer'
import * as M from '@principia/io/Managed'
import * as P from '@principia/io/Promise'
import { intersect } from '@principia/io/util/intersect'

import { AnnotationsTag, fibers } from '../Annotation'
import { HashEqFiber, HashEqFiberId } from '../util'
import { LiveTag } from './Live'

export class Data {
  constructor(readonly duration: number, readonly sleeps: List<readonly [number, P.Promise<never, void>]>) {}
}

export class Sleep {
  constructor(readonly duration: number, readonly promise: P.Promise<never, void>, readonly fiberId: FiberId) {}
}

interface Start {
  readonly _tag: 'Start'
}

interface Pending {
  readonly _tag: 'Pending'
  readonly fiber: Fiber<never, void>
}

interface Done {
  readonly _tag: 'Done'
}

type WarningData = Start | Pending | Done

const Start: WarningData = { _tag: 'Start' }

const Pending = (fiber: Fiber<never, void>): WarningData => ({ _tag: 'Pending', fiber })

const Done: WarningData = { _tag: 'Done' }

const warning =
  'Warning: A test is using time, but is not advancing the test clock, ' +
  'which may result in the test hanging. Use TestClock.adjust to ' +
  'manually advance the time.'

export const TestClockTag = tag<TestClock>()

export class TestClock implements Clock {
  constructor(
    readonly clockState: URef<Data>,
    readonly live: Live,
    readonly annotations: Annotations,
    readonly warningState: URefM<WarningData>
  ) {}
  sleep = (ms: number) => {
    const self = this
    return I.gen(function* (_) {
      const promise = yield* _(P.make<never, void>())
      const wait    = yield* _(
        Ref.modify_(self.clockState, (data) => {
          const end = data.duration + ms
          if (end > data.duration) {
            return tuple(true, new Data(data.duration, Li.append_(data.sleeps, tuple(end, promise))))
          } else {
            return tuple(false, data)
          }
        })
      )
      yield* _(
        I.deferTotal(() => {
          if (wait) {
            return self.warningStart['*>'](promise.await)
          } else {
            return promise.succeed()['*>'](I.unit())
          }
        })
      )
    })
  }

  currentTime = this.clockState.get['<$>']((data) => data.duration)

  adjust(duration: number): UIO<void> {
    return this.warningDone['*>'](this.run((d) => d + duration))
  }

  setDate(date: Date): UIO<void> {
    return this.setTime(date.getTime())
  }

  setTime(time: number): UIO<void> {
    return this.warningDone['*>'](this.run((_) => time))
  }

  sleeps = this.clockState.get['<$>']((data) => Li.map_(data.sleeps, ([_]) => _))

  get supervizedFibers(): UIO<HashSet<RuntimeFiber<any, any>>> {
    return I.descriptorWith((descriptor) =>
      this.annotations
        .get(fibers)
        ['>>='](
          E.match(
            (_) => I.succeed(HS.make(HashEqFiber)),
            flow(
              I.foreach(Ref.get),
              I.map(A.foldl(HS.make(HashEqFiber), HS.union_)),
              I.map(HS.filter((f) => !eqFiberId.equals_(f.id, descriptor.id)))
            )
          )
        )
    )
  }

  private get freeze(): IO<unknown, void, HashMap<FiberId, FiberStatus>> {
    return this.supervizedFibers['>>='](
      I.foldl(HM.make(HashEqFiberId), (map, fiber) =>
        fiber.status['>>=']((status) => {
          switch (status._tag) {
            case 'Done': {
              return I.succeed(HM.set_(map, fiber.id, status))
            }
            case 'Suspended': {
              return I.succeed(HM.set_(map, fiber.id, status))
            }
            default: {
              return I.fail(undefined)
            }
          }
        })
      )
    )
  }

  private get delay(): UIO<void> {
    return this.live.provide(I.sleep(5))
  }

  private get awaitSuspended(): UIO<void> {
    return pipe(
      this.suspended,
      I.crossWith(this.live.provide(I.sleep(10))['*>'](this.suspended), (x, y) => x === y),
      I.filterOrFail((_: boolean) => _)((): void => undefined),
      I.eventually,
      I.asUnit
    )
  }

  private run(f: (duration: number) => number): UIO<void> {
    return this.awaitSuspended['*>'](
      Ref.modify_(this.clockState, (data) => {
        const end    = f(data.duration)
        const sorted = Li.sortWith_(data.sleeps, ([x], [y]) => N.Ord.compare_(x, y))
        return pipe(
          sorted,
          Li.first,
          O.bind(([duration, promise]) =>
            duration <= end ? O.Some(tuple(O.Some(tuple(end, promise)), new Data(duration, Li.tail(sorted)))) : O.None()
          ),
          O.getOrElse(() => tuple(O.None(), new Data(end, data.sleeps)))
        )
      })
    )['>>='](
      O.match(
        () => I.unit(),
        ([end, promise]) =>
          promise
            .succeed()
            ['*>'](I.yieldNow)
            ['*>'](this.run((_) => end))
      )
    )
  }

  private get suspended(): IO<unknown, void, HashMap<FiberId, FiberStatus>> {
    return this.freeze['<*>'](this.delay['*>'](this.freeze))['>>='](([first, last]) => {
      if (
        /*
         * first.size === last.size &&
         * HM.ifilterMap_(first, (i, s) =>
         *   pipe(
         *     last,
         *     HM.get(i),
         *     O.filter((s1) => s1._tag === s._tag)
         *   )
         * ).size === 0
         */
        first === last
      ) {
        return I.succeed(first)
      } else {
        return I.fail(undefined)
      }
    })
  }

  private warningDone: UIO<void> = RefM.updateSome_(
    this.warningState,
    matchTag({
      Start: () => O.Some(I.succeed(Done)),
      Pending: ({ fiber }) => O.Some(Fi.interrupt(fiber)['$>'](() => Done)),
      Done: () => O.None()
    })
  )

  private warningStart: UIO<void> = RefM.updateSome_(
    this.warningState,
    matchTag(
      {
        Start: () =>
          pipe(
            this.live.provide(pipe(Console.putStrLn(warning), I.delay(5000))),
            I.makeInterruptible,
            I.fork,
            I.map(Pending),
            O.Some
          )
      },
      () => O.None<IO<unknown, never, WarningData>>()
    )
  )

  static live(data: Data): Layer<Has<Live> & Has<Annotations>, never, Has<Clock> & Has<TestClock>> {
    return L.fromRawManaged(
      pipe(
        M.asksServicesManaged({ live: LiveTag, annotations: AnnotationsTag })(({ live, annotations }) =>
          M.gen(function* (_) {
            const ref  = yield* _(Ref.make(data))
            const refM = yield* _(RefM.make(Start))
            const test = yield* _(
              M.make_(I.succeed(new TestClock(ref, live, annotations, refM)), (tc) => tc.warningDone)
            )
            return intersect(ClockTag.of(new ProxyClock(test.currentTime, test.sleep)), TestClockTag.of(test))
          })
        )
      )
    )
  }

  static default: Layer<Has<Live> & Has<Annotations>, never, Has<Clock> & Has<TestClock>> = TestClock.live(
    new Data(0, Li.empty())
  )
}
