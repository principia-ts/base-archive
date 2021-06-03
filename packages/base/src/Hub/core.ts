import type { MutableQueue } from '../util/support/MutableQueue'

import * as C from '../Chunk'
import { parallel } from '../ExecutionStrategy'
import * as Ex from '../Exit'
import * as F from '../Fiber'
import { pipe } from '../function'
import * as I from '../IO'
import * as M from '../Managed'
import * as RM from '../Managed/ReleaseMap'
import * as HS from '../MutableHashSet'
import * as P from '../Promise'
import * as Q from '../Queue'
import { XQueue } from '../Queue'
import * as Ref from '../Ref'
import { AtomicBoolean } from '../util/support/AtomicBoolean'
import { Unbounded } from '../util/support/MutableQueue'
import * as _ from './internal'
import * as S from './Strategy'

export type HubDequeue<R, E, A> = Q.XQueue<never, R, unknown, E, never, A>

export type HubEnqueue<R, E, A> = Q.XQueue<R, never, E, unknown, A, never>

export type Hub<A> = XHub<unknown, unknown, never, never, A, A>

export const HubTypeId = Symbol()

/**
 * A `Hub<RA, RB, EA, EB, A, B>` is an asynchronous message hub. Publishers
 * can publish messages of type `A` to the hub and subscribers can subscribe to
 * take messages of type `B` from the hub. Publishing messages can require an
 * environment of type `RA` and fail with an error of type `EA`. Taking
 * messages can require an environment of type `RB` and fail with an error of
 * type `EB`.
 */
export interface XHub<RA, RB, EA, EB, A, B> {
  readonly _RA: (_: RA) => void
  readonly _RB: (_: RB) => void
  readonly _EA: () => EA
  readonly _EB: () => EB
  readonly _A: (_: A) => void
  readonly _B: () => B
  readonly _U: 'Hub'
}

export abstract class XHubInternal<RA, RB, EA, EB, A, B> implements XHub<RA, RB, EA, EB, A, B> {
  readonly _RA!: (_: RA) => void
  readonly _RB!: (_: RB) => void
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B
  readonly _U = 'Hub'

  /**
   * Waits for the hub to be shut down.
   */
  abstract awaitShutdown: I.UIO<void>

  /**
   * The maximum capacity of the hub.
   */
  abstract capacity: number

  /**
   * Checks whether the hub is shut down.
   */
  abstract isShutdown: I.UIO<boolean>

  /**
   * Publishes a message to the hub, returning whether the message was
   * published to the hub.
   */
  abstract publish(a: A): I.IO<RA, EA, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether
   * they were published to the hub.
   */
  abstract publishAll(as: Iterable<A>): I.IO<RA, EA, boolean>

  /**
   * Shuts down the hub.
   */
  abstract shutdown: I.UIO<void>

  /**
   * The current number of messages in the hub.
   */
  abstract size: I.UIO<number>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription
   * can be evaluated multiple times within the scope of the managed to take a
   * message from the hub each time.
   */
  abstract subscribe: M.Managed<unknown, never, HubDequeue<RB, EB, B>>
}

/**
 * @optimize remove
 */
export function concrete<RA, RB, EA, EB, A, B>(
  _: XHub<RA, RB, EA, EB, A, B>
): asserts _ is XHubInternal<RA, RB, EA, EB, A, B> {
  //
}

/**
 * Waits for the hub to be shut down.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>): I.UIO<void> {
  concrete(self)
  return self.awaitShutdown
}

/**
 * The maximum capacity of the hub.
 */
export function capacity<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>): number {
  concrete(self)
  return self.capacity
}

/**
 * Checks whether the hub is shut down.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>): I.UIO<boolean> {
  concrete(self)
  return self.isShutdown
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 */
export function publish_<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>, a: A): I.IO<RA, EA, boolean> {
  concrete(self)
  return self.publish(a)
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 *
 * @dataFirst publish_
 */
export function publish<A>(a: A) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => publish_(self, a)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 */
export function publishAll_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
): I.IO<RA, EA, boolean> {
  concrete(self)
  return self.publishAll(as)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 *
 * @dataFirst publishAll_
 */
export function publishAll<A>(as: Iterable<A>) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => publishAll_(self, as)
}

/**
 * Shuts down the hub.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>): I.UIO<void> {
  concrete(self)
  return self.shutdown
}

/**
 * The current number of messages in the hub.
 */
export function size<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>): I.UIO<number> {
  concrete(self)
  return self.size
}

/**
 * Subscribes to receive messages from the hub. The resulting subscription
 * can be evaluated multiple times within the scope of the managed to take a
 * message from the hub each time.
 */
export function subscribe<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): M.Managed<unknown, never, HubDequeue<RB, EB, B>> {
  concrete(self)
  return self.subscribe
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 */
export function contramapM_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): XHub<RC & RA, RB, EA | EC, EB, C, B> {
  return dimapM_(self, f, I.succeed)
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 *
 * @dataFirst contramapM_
 */
export function contramapM<RC, EC, A, C>(f: (c: C) => I.IO<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => contramapM_(self, f)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): XHub<RA, RB, EA, EB, C, D> {
  return dimapM_(
    self,
    (c) => I.succeed(f(c)),
    (b) => I.succeed(g(b))
  )
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 *
 * @dataFirst dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(self: XHub<RA, RB, EA, EB, A, B>) => dimap_(self, f, g)
}

class DimapMImplementation<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D> extends XHubInternal<
  RC & RA,
  RD & RB,
  EA | EC,
  EB | ED,
  C,
  D
> {
  awaitShutdown: I.UIO<void>
  capacity: number
  isShutdown: I.UIO<boolean>
  shutdown: I.UIO<void>
  size: I.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<RD & RB, ED | EB, D>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (c: C) => I.IO<RC, EC, A>,
    g: (b: B) => I.IO<RD, ED, D>
  ) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity      = source.capacity
    this.isShutdown    = source.isShutdown
    this.shutdown      = source.shutdown
    this.size          = source.size
    this.subscribe     = M.map_(source.subscribe, Q.mapM(g))
  }

  publish(c: C) {
    return I.bind_(this.f(c), (a) => this.source.publish(a))
  }

  publishAll(cs: Iterable<C>) {
    return I.bind_(I.foreach_(cs, this.f), (as) => this.source.publishAll(as))
  }
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): XHub<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  concrete(self)
  return new DimapMImplementation(self, f, g)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 *
 * @dataFirst dimapM_
 */
export function dimapM<A, B, C, D, EC, ED, RC, RD>(f: (c: C) => I.IO<RC, EC, A>, g: (b: B) => I.IO<RD, ED, D>) {
  return <RA, RB, EA, EB>(self: XHub<RA, RB, EA, EB, A, B>) => dimapM_(self, f, g)
}

class filterInputMImplementation<RA, RA1, RB, EA, EA1, EB, A, B> extends XHubInternal<
  RA & RA1,
  RB,
  EA | EA1,
  EB,
  A,
  B
> {
  awaitShutdown: I.UIO<void>
  capacity: number
  isShutdown: I.UIO<boolean>
  shutdown: I.UIO<void>
  size: I.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<RB, EB, B>>

  constructor(readonly source: XHubInternal<RA, RB, EA, EB, A, B>, readonly f: (a: A) => I.IO<RA1, EA1, boolean>) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity      = source.capacity
    this.isShutdown    = source.isShutdown
    this.shutdown      = source.shutdown
    this.size          = source.size
    this.subscribe     = source.subscribe
  }

  publish(a: A) {
    return I.bind_(this.f(a), (b) => (b ? this.source.publish(a) : I.succeed(false)))
  }

  publishAll(as: Iterable<A>) {
    return I.bind_(I.filter_(as, this.f), (as) => (C.isNonEmpty(as) ? this.source.publishAll(as) : I.succeed(false)))
  }
}

/**
 * Filters messages published to the hub using the specified function.
 */
export function filterInput_<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>, f: (a: A) => boolean) {
  return filterInputM_(self, (a) => I.succeed(f(a)))
}

/**
 * Filters messages published to the hub using the specified function.
 *
 * @dataFirst filterInput_
 */
export function filterInput<A>(f: (a: A) => boolean) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => filterInput_(self, f)
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 */
export function filterInputM_<RA, RA1, RB, EA, EA1, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: A) => I.IO<RA1, EA1, boolean>
): XHub<RA & RA1, RB, EA | EA1, EB, A, B> {
  concrete(self)
  return new filterInputMImplementation(self, f)
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 *
 * @dataFirst filterInputM_
 */
export function filterInputM<RA1, EA1, A>(f: (a: A) => I.IO<RA1, EA1, boolean>) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => filterInputM_(self, f)
}

/**
 * Filters messages taken from the hub using the specified function.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): XHub<RA, RB, EA, EB, A, B> {
  return filterOutputM_(self, (b) => I.succeed(f(b)))
}

/**
 * Filters messages taken from the hub using the specified function.
 *
 * @dataFirst filterOutput_
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(self: XHub<RA, RB, EA, EB, A, B>) => filterOutput_(self, f)
}

class filterOutputMImplementation<RA, RB, RB1, EA, EB, EB1, A, B> extends XHubInternal<
  RA,
  RB & RB1,
  EA,
  EB | EB1,
  A,
  B
> {
  awaitShutdown: I.UIO<void>
  capacity: number
  isShutdown: I.UIO<boolean>
  shutdown: I.UIO<void>
  size: I.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<RB & RB1, EB | EB1, B>>

  constructor(readonly source: XHubInternal<RA, RB, EA, EB, A, B>, readonly f: (b: B) => I.IO<RB1, EB1, boolean>) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity      = source.capacity
    this.isShutdown    = source.isShutdown
    this.shutdown      = source.shutdown
    this.size          = source.size
    this.subscribe     = M.map_(source.subscribe, Q.filterOutputM(f))
  }

  publish(a: A) {
    return this.source.publish(a)
  }

  publishAll(as: Iterable<A>) {
    return this.source.publishAll(as)
  }
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 */
export function filterOutputM_<RA, RB, RB1, EA, EB, EB1, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: B) => I.IO<RB1, EB1, boolean>
): XHub<RA, RB & RB1, EA, EB | EB1, A, B> {
  concrete(self)
  return new filterOutputMImplementation(self, f)
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 *
 * @dataFirst filterOutputM_
 */
export function filterOutputM<RB1, EB1, B>(f: (a: B) => I.IO<RB1, EB1, boolean>) {
  return <RA, RB, EA, EB, A>(self: XHub<RA, RB, EA, EB, A, B>) => filterOutputM_(self, f)
}

/**
 * Transforms messages taken from the hub using the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XHub<RA, RB, EA, EB, A, C> {
  return mapM_(self, (b) => I.succeed(f(b)))
}

/**
 * Transforms messages taken from the hub using the specified function.
 *
 * @dataFirst map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <RA, RB, EA, EB, A>(self: XHub<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 */
export function mapM_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): XHub<RA, RC & RB, EA, EB | EC, A, C> {
  return dimapM_(self, (a) => I.succeed<A>(a), f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 *
 * @dataFirst mapM_
 */
export function mapM<B, C, EC, RC>(f: (b: B) => I.IO<RC, EC, C>) {
  return <A, EA, EB, RA, RB>(self: XHub<RA, RB, EA, EB, A, B>) => mapM_(self, f)
}

class ToQueueImplementation<RA, RB, EA, EB, A, B> extends XQueue<RA, never, EA, unknown, A, never> {
  awaitShutdown: I.UIO<void>
  capacity: number
  isShutdown: I.UIO<boolean>
  shutdown: I.UIO<void>
  size: I.UIO<number>
  take: I.IO<unknown, never, never>
  takeAll: I.IO<unknown, never, C.Chunk<never>>

  constructor(readonly source: XHubInternal<RA, RB, EA, EB, A, B>) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity      = source.capacity
    this.isShutdown    = source.isShutdown
    this.shutdown      = source.shutdown
    this.size          = source.size
    this.take          = I.never
    this.takeAll       = I.succeed(C.empty())
  }

  offer = (a: A): I.IO<RA, EA, boolean> => this.source.publish(a)

  offerAll = (as: Iterable<A>): I.IO<RA, EA, boolean> => this.source.publishAll(as)

  takeUpTo = (): I.IO<unknown, never, C.Chunk<never>> => I.succeed(C.empty())
}

/**
 * Views the hub as a queue that can only be written to.
 */
export function toQueue<RA, RB, EA, EB, A, B>(self: XHub<RA, RB, EA, EB, A, B>): HubEnqueue<RA, EA, A> {
  concrete(self)
  return new ToQueueImplementation(self)
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeBounded<A>(requestedCapacity: number): I.UIO<Hub<A>> {
  return I.bind_(
    I.effectTotal(() => _.makeBounded<A>(requestedCapacity)),
    (_) => makeHub(_, new S.BackPressure())
  )
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeBounded<A>(requestedCapacity: number): Hub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map())))

  return unsafeMakeHub(
    _.makeBounded<A>(requestedCapacity),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new S.BackPressure()
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeDropping<A>(requestedCapacity: number): I.UIO<Hub<A>> {
  return I.bind_(
    I.effectTotal(() => {
      return _.makeBounded<A>(requestedCapacity)
    }),
    (_) => makeHub(_, new S.Dropping())
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeDropping<A>(requestedCapacity: number): Hub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map())))

  return unsafeMakeHub(
    _.makeBounded<A>(requestedCapacity),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new S.Dropping()
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeSliding<A>(requestedCapacity: number): I.UIO<Hub<A>> {
  return I.bind_(
    I.effectTotal(() => {
      return _.makeBounded<A>(requestedCapacity)
    }),
    (_) => makeHub(_, new S.Sliding())
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeSliding<A>(requestedCapacity: number): Hub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map())))

  return unsafeMakeHub(
    _.makeBounded<A>(requestedCapacity),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new S.Sliding()
  )
}

/**
 * Creates an unbounded hub.
 */
export function makeUnbounded<A>(): I.UIO<Hub<A>> {
  return I.bind_(
    I.effectTotal(() => {
      return _.makeUnbounded<A>()
    }),
    (_) => makeHub(_, new S.Dropping())
  )
}

/**
 * Creates an unbounded hub.
 */
export function unsafeMakeUnbounded<A>(): Hub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map())))

  return unsafeMakeHub(
    _.makeUnbounded<A>(),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new S.Dropping()
  )
}

class UnsafeMakeHubImplementation<A> extends XHubInternal<unknown, unknown, never, never, A, A> {
  awaitShutdown: I.UIO<void>
  capacity: number
  isShutdown: I.UIO<boolean>
  shutdown: I.UIO<void>
  size: I.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<unknown, never, A>>

  constructor(
    private hub: _.Hub<A>,
    private subscribers: HS.HashSet<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>>,
    releaseMap: RM.ReleaseMap,
    shutdownHook: P.Promise<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: S.Strategy<A>
  ) {
    super()
    this.awaitShutdown = P.await(shutdownHook)
    this.capacity      = hub.capacity
    this.isShutdown    = I.effectTotal(() => shutdownFlag.get)
    this.shutdown      = pipe(
      I.fiberId(),
      I.bind((fiberId) =>
        I.deferTotal(() => {
          shutdownFlag.set(true)
          return pipe(
            M.releaseAll_(releaseMap, Ex.interrupt(fiberId), parallel)['*>'](strategy.shutdown),
            I.whenM(shutdownHook.succeed(undefined))
          )
        })
      ),
      I.makeUninterruptible
    )

    this.size = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      }

      return I.succeed(hub.size())
    })

    this.subscribe = pipe(
      M.do,
      M.bindS('dequeue', () => I.toManaged_(makeSubscription(hub, subscribers, strategy))),
      M.tap(({ dequeue }) =>
        M.makeExit_(
          RM.add(releaseMap, (_) => Q.shutdown(dequeue)),
          (finalizer, exit) => finalizer(exit)
        )
      ),
      M.map(({ dequeue }) => dequeue)
    )
  }

  publish(a: A): I.IO<unknown, never, boolean> {
    return I.deferTotal(() => {
      if (this.shutdownFlag.get) {
        return I.interrupt
      }

      if (this.hub.publish(a)) {
        this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
        return I.succeed(true)
      }

      return this.strategy.handleSurplus(this.hub, this.subscribers, C.single(a), this.shutdownFlag)
    })
  }

  publishAll(as: Iterable<A>): I.IO<unknown, never, boolean> {
    return I.deferTotal(() => {
      if (this.shutdownFlag.get) {
        return I.interrupt
      }

      const surplus = _.unsafePublishAll(this.hub, as)

      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)

      if (C.isEmpty(surplus)) {
        return I.succeed(true)
      }

      return this.strategy.handleSurplus(this.hub, this.subscribers, surplus, this.shutdownFlag)
    })
  }
}

function makeHub<A>(hub: _.Hub<A>, strategy: S.Strategy<A>): I.UIO<Hub<A>> {
  return I.bind_(RM.make, (releaseMap) => {
    return I.map_(P.make<never, void>(), (promise) => {
      return unsafeMakeHub(hub, makeSubscribersHashSet<A>(), releaseMap, promise, new AtomicBoolean(false), strategy)
    })
  })
}

/**
 * Unsafely creates a hub with the specified strategy.
 */
function unsafeMakeHub<A>(
  hub: _.Hub<A>,
  subscribers: HS.HashSet<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>>,
  releaseMap: RM.ReleaseMap,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: S.Strategy<A>
): Hub<A> {
  return new UnsafeMakeHubImplementation(hub, subscribers, releaseMap, shutdownHook, shutdownFlag, strategy)
}

/**
 * Creates a subscription with the specified strategy.
 */
function makeSubscription<A>(
  hub: _.Hub<A>,
  subscribers: HS.HashSet<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>>,
  strategy: S.Strategy<A>
): I.UIO<Q.Dequeue<A>> {
  return I.map_(P.make<never, void>(), (promise) => {
    return unsafeMakeSubscription(
      hub,
      subscribers,
      hub.subscribe(),
      new Unbounded<P.Promise<never, A>>(),
      promise,
      new AtomicBoolean(false),
      strategy
    )
  })
}

class UnsafeMakeSubscriptionImplementation<A> extends XQueue<never, unknown, unknown, never, never, A> {
  constructor(
    private hub: _.Hub<A>,
    private subscribers: HS.HashSet<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>>,
    private subscription: _.Subscription<A>,
    private pollers: MutableQueue<P.Promise<never, A>>,
    private shutdownHook: P.Promise<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: S.Strategy<A>
  ) {
    super()
  }

  awaitShutdown: I.UIO<void> = P.await(this.shutdownHook)

  capacity: number = this.hub.capacity

  isShutdown: I.UIO<boolean> = I.effectTotal(() => this.shutdownFlag.get)

  shutdown: I.UIO<void> = pipe(
    I.fiberId(),
    I.bind((fiberId) =>
      I.deferTotal(() => {
        this.shutdownFlag.set(true)
        return pipe(
          I.foreachPar_(_.unsafePollAllQueue(this.pollers), P.interruptAs(fiberId))['*>'](
            I.effectTotal(() => this.subscription.unsubscribe())
          ),
          I.whenM(this.shutdownHook.succeed(undefined))
        )
      })
    )
  )

  size: I.UIO<number> = I.deferTotal(() => {
    if (this.shutdownFlag.get) {
      return I.interrupt
    }

    return I.succeed(this.subscription.size())
  })

  offer = (_: never): I.IO<never, unknown, boolean> => I.succeed(false)

  offerAll = (_: Iterable<never>): I.IO<never, unknown, boolean> => I.succeed(false)

  take: I.IO<unknown, never, A> = pipe(
    I.fiberId(),
    I.bind((fiberId) =>
      I.deferTotal(() => {
        if (this.shutdownFlag.get) {
          return I.interrupt
        }

        const empty   = null as unknown as A
        const message = this.pollers.isEmpty ? this.subscription.poll(empty) : empty

        if (message === null) {
          const promise = P.unsafeMake<never, A>(fiberId)

          return I.onInterrupt_(
            I.deferTotal(() => {
              this.pollers.offer(promise)
              this.subscribers.add(new _.HashedPair(this.subscription, this.pollers))
              this.strategy.unsafeCompletePollers(this.hub, this.subscribers, this.subscription, this.pollers)
              if (this.shutdownFlag.get) {
                return I.interrupt
              } else {
                return P.await(promise)
              }
            }),
            () =>
              I.effectTotal(() => {
                _.unsafeRemove(this.pollers, promise)
              })
          )
        } else {
          this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
          return I.succeed(message)
        }
      })
    )
  )

  takeAll: I.IO<unknown, never, C.Chunk<A>> = I.deferTotal(() => {
    if (this.shutdownFlag.get) {
      return I.interrupt
    }

    const as = this.pollers.isEmpty ? _.unsafePollAllSubscription(this.subscription) : C.empty<A>()

    this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)

    return I.succeed(as)
  })

  takeUpTo = (n: number): I.IO<unknown, never, C.Chunk<A>> => {
    return I.deferTotal(() => {
      if (this.shutdownFlag.get) {
        return I.interrupt
      }

      const as = this.pollers.isEmpty ? _.unsafePollN(this.subscription, n) : C.empty<A>()

      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return I.succeed(as)
    })
  }
}

/**
 * Unsafely creates a subscription with the specified strategy.
 */
function unsafeMakeSubscription<A>(
  hub: _.Hub<A>,
  subscribers: HS.HashSet<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>>,
  subscription: _.Subscription<A>,
  pollers: MutableQueue<P.Promise<never, A>>,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: S.Strategy<A>
): Q.Dequeue<A> {
  return new UnsafeMakeSubscriptionImplementation(
    hub,
    subscribers,
    subscription,
    pollers,
    shutdownHook,
    shutdownFlag,
    strategy
  )
}

function makeSubscribersHashSet<A>(): HS.HashSet<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>> {
  return HS.make<_.HashedPair<_.Subscription<A>, MutableQueue<P.Promise<never, A>>>>()
}
