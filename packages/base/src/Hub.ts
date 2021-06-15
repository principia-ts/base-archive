import type { MutableQueue } from './util/support/MutableQueue'

import * as C from './Chunk'
import { parallel } from './ExecutionStrategy'
import * as Ex from './Exit'
import * as F from './Fiber'
import { identity, pipe } from './function'
import * as I from './IO'
import * as M from './Managed'
import * as RM from './Managed/ReleaseMap'
import * as HS from './MutableHashSet'
import * as P from './Promise'
import * as Q from './Queue'
import { Queue } from './Queue'
import * as Ref from './Ref'
import * as St from './Structural'
import { AtomicBoolean } from './util/support/AtomicBoolean'
import { Unbounded } from './util/support/MutableQueue'
import * as MQ from './util/support/MutableQueue'

export type HubDequeue<R, E, A> = Q.Queue<never, R, unknown, E, never, A>

export type HubEnqueue<R, E, A> = Q.Queue<R, never, E, unknown, A, never>

export type UHub<A> = Hub<unknown, unknown, never, never, A, A>

export const HubTypeId = Symbol()
export type HubTypeId = typeof HubTypeId

/**
 * A `Hub<RA, RB, EA, EB, A, B>` is an asynchronous message hub. Publishers
 * can publish messages of type `A` to the hub and subscribers can subscribe to
 * take messages of type `B` from the hub. Publishing messages can require an
 * environment of type `RA` and fail with an error of type `EA`. Taking
 * messages can require an environment of type `RB` and fail with an error of
 * type `EB`.
 */

export abstract class Hub<RA, RB, EA, EB, A, B> {
  readonly [HubTypeId]: HubTypeId = HubTypeId
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
export function concrete<RA, RB, EA, EB, A, B>(_: Hub<RA, RB, EA, EB, A, B>): asserts _ is Hub<RA, RB, EA, EB, A, B> {
  //
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function boundedHub<A>(requestedCapacity: number): I.UIO<UHub<A>> {
  return I.bind_(
    I.effectTotal(() => _makeBounded<A>(requestedCapacity)),
    (_) => _hub(_, new BackPressure())
  )
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeBoundedHub<A>(requestedCapacity: number): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeHub(
    _makeBounded<A>(requestedCapacity),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafePromise<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new BackPressure()
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function droppingHub<A>(requestedCapacity: number): I.UIO<UHub<A>> {
  return I.bind_(
    I.effectTotal(() => {
      return _makeBounded<A>(requestedCapacity)
    }),
    (_) => _hub(_, new Dropping())
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeDroppingHub<A>(requestedCapacity: number): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeHub(
    _makeBounded<A>(requestedCapacity),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafePromise<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new Dropping()
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function slidingHub<A>(requestedCapacity: number): I.UIO<UHub<A>> {
  return I.bind_(
    I.effectTotal(() => {
      return _makeBounded<A>(requestedCapacity)
    }),
    (_) => _hub(_, new Sliding())
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeSlidingHub<A>(requestedCapacity: number): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeHub(
    _makeBounded<A>(requestedCapacity),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafePromise<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new Sliding()
  )
}

/**
 * Creates an unbounded hub.
 */
export function unboundedHub<A>(): I.UIO<UHub<A>> {
  return I.bind_(
    I.effectTotal(() => {
      return _makeUnbounded<A>()
    }),
    (_) => _hub(_, new Dropping())
  )
}

/**
 * Creates an unbounded hub.
 */
export function unsafeUnboundedHub<A>(): UHub<A> {
  const releaseMap = new RM.ReleaseMap(Ref.unsafeRef<RM.State>(new RM.Running(0, new Map(), identity)))

  return _unsafeHub(
    _makeUnbounded<A>(),
    subscribersHashSet<A>(),
    releaseMap,
    P.unsafePromise<never, void>(F.emptyFiberId),
    new AtomicBoolean(false),
    new Dropping()
  )
}

function _hub<A>(hub: HubInternal<A>, strategy: Strategy<A>): I.UIO<UHub<A>> {
  return I.bind_(RM.make, (releaseMap) => {
    return I.map_(P.promise<never, void>(), (promise) => {
      return _unsafeHub(hub, subscribersHashSet<A>(), releaseMap, promise, new AtomicBoolean(false), strategy)
    })
  })
}

/**
 * Unsafely creates a hub with the specified strategy.
 */
function _unsafeHub<A>(
  hub: HubInternal<A>,
  subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
  releaseMap: RM.ReleaseMap,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): UHub<A> {
  return new (class extends Hub<unknown, unknown, never, never, A, A> {
    awaitShutdown = P.await(shutdownHook)
    capacity      = hub.capacity
    isShutdown    = I.effectTotal(() => shutdownFlag.get)
    shutdown      = pipe(
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

    size = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      }

      return I.succeedNow(hub.size())
    })

    subscribe = pipe(
      M.do,
      M.bindS('dequeue', () => I.toManaged_(subscription(hub, subscribers, strategy))),
      M.tap(({ dequeue }) =>
        M.makeExit_(
          RM.add(releaseMap, (_) => Q.shutdown(dequeue)),
          (finalizer, exit) => finalizer(exit)
        )
      ),
      M.map(({ dequeue }) => dequeue)
    )

    publish = (a: A): I.IO<unknown, never, boolean> =>
      I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        }

        if (hub.publish(a)) {
          strategy.unsafeCompleteSubscribers(hub, subscribers)
          return I.succeedNow(true)
        }

        return strategy.handleSurplus(hub, subscribers, C.single(a), shutdownFlag)
      })

    publishAll = (as: Iterable<A>): I.IO<unknown, never, boolean> =>
      I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        }

        const surplus = _unsafePublishAll(hub, as)

        strategy.unsafeCompleteSubscribers(hub, subscribers)

        if (C.isEmpty(surplus)) {
          return I.succeedNow(true)
        }

        return strategy.handleSurplus(hub, subscribers, surplus, shutdownFlag)
      })
  })()
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Views the hub as a queue that can only be written to.
 */
export function toQueue<RA, RB, EA, EB, A, B>(source: Hub<RA, RB, EA, EB, A, B>): HubEnqueue<RA, EA, A> {
  concrete(source)
  return new (class extends Queue<RA, never, EA, unknown, A, never> {
    awaitShutdown = source.awaitShutdown
    capacity      = source.capacity
    isShutdown    = source.isShutdown
    shutdown      = source.shutdown
    size          = source.size
    take          = I.never
    takeAll       = I.succeedNow(C.empty<never>())
    offer         = (a: A): I.IO<RA, EA, boolean> => source.publish(a)
    offerAll      = (as: Iterable<A>): I.IO<RA, EA, boolean> => source.publishAll(as)
    takeUpTo      = (): I.IO<unknown, never, C.Chunk<never>> => I.succeedNow(C.empty())
  })()
}

/**
 * Creates a subscription with the specified strategy.
 */
function subscription<A>(
  hub: HubInternal<A>,
  subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
  strategy: Strategy<A>
): I.UIO<Q.Dequeue<A>> {
  return I.map_(P.promise<never, void>(), (promise) => {
    return unsafeSubscription(
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

/**
 * Unsafely creates a subscription with the specified strategy.
 */
function unsafeSubscription<A>(
  hub: HubInternal<A>,
  subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>,
  subscription: SubscriptionInternal<A>,
  pollers: MutableQueue<P.Promise<never, A>>,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Q.Dequeue<A> {
  return new (class extends Queue<never, unknown, unknown, never, never, A> {
    awaitShutdown: I.UIO<void> = P.await(shutdownHook)

    capacity: number = hub.capacity

    isShutdown: I.UIO<boolean> = I.effectTotal(() => shutdownFlag.get)

    shutdown: I.UIO<void> = pipe(
      I.fiberId(),
      I.bind((fiberId) =>
        I.deferTotal(() => {
          shutdownFlag.set(true)
          return pipe(
            I.foreachPar_(_unsafePollAllQueue(pollers), P.interruptAs(fiberId))['*>'](
              I.effectTotal(() => subscription.unsubscribe())
            ),
            I.whenM(shutdownHook.succeed(undefined))
          )
        })
      )
    )

    size: I.UIO<number> = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      }

      return I.succeedNow(subscription.size())
    })

    offer = (_: never): I.IO<never, unknown, boolean> => I.succeedNow(false)

    offerAll = (_: Iterable<never>): I.IO<never, unknown, boolean> => I.succeedNow(false)

    take: I.IO<unknown, never, A> = pipe(
      I.fiberId(),
      I.bind((fiberId) =>
        I.deferTotal(() => {
          if (shutdownFlag.get) {
            return I.interrupt
          }

          const empty   = null as unknown as A
          const message = pollers.isEmpty ? subscription.poll(empty) : empty

          if (message === null) {
            const promise = P.unsafePromise<never, A>(fiberId)

            return I.onInterrupt_(
              I.deferTotal(() => {
                pollers.offer(promise)
                subscribers.add(new HashedPair(subscription, pollers))
                strategy.unsafeCompletePollers(hub, subscribers, subscription, pollers)
                if (shutdownFlag.get) {
                  return I.interrupt
                } else {
                  return P.await(promise)
                }
              }),
              () =>
                I.effectTotal(() => {
                  _unsafeRemove(pollers, promise)
                })
            )
          } else {
            strategy.unsafeOnHubEmptySpace(hub, subscribers)
            return I.succeedNow(message)
          }
        })
      )
    )

    takeAll: I.IO<unknown, never, C.Chunk<A>> = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      }

      const as = pollers.isEmpty ? _unsafePollAllSubscription(subscription) : C.empty<A>()

      strategy.unsafeOnHubEmptySpace(hub, subscribers)

      return I.succeedNow(as)
    })

    takeUpTo = (n: number): I.IO<unknown, never, C.Chunk<A>> => {
      return I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        }

        const as = pollers.isEmpty ? _unsafePollN(subscription, n) : C.empty<A>()

        strategy.unsafeOnHubEmptySpace(hub, subscribers)
        return I.succeedNow(as)
      })
    }
  })()
}

function subscribersHashSet<A>(): HS.HashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>> {
  return HS.hashSet<HashedPair<SubscriptionInternal<A>, MutableQueue<P.Promise<never, A>>>>()
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 */
export function mapM_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): Hub<RA, RC & RB, EA, EB | EC, A, C> {
  return dimapM_(self, I.succeedNow, f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 *
 * @dataFirst mapM_
 */
export function mapM<B, C, EC, RC>(f: (b: B) => I.IO<RC, EC, C>) {
  return <A, EA, EB, RA, RB>(self: Hub<RA, RB, EA, EB, A, B>) => mapM_(self, f)
}

/**
 * Transforms messages taken from the hub using the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): Hub<RA, RB, EA, EB, A, C> {
  return mapM_(self, (b) => I.succeedNow(f(b)))
}

/**
 * Transforms messages taken from the hub using the specified function.
 *
 * @dataFirst map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <RA, RB, EA, EB, A>(self: Hub<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 */
export function contramapM_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): Hub<RC & RA, RB, EA | EC, EB, C, B> {
  return dimapM_(self, f, I.succeedNow)
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 *
 * @dataFirst contramapM_
 */
export function contramapM<RC, EC, A, C>(f: (c: C) => I.IO<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => contramapM_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  source: Hub<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): Hub<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  return new (class extends Hub<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
    awaitShutdown = source.awaitShutdown
    capacity      = source.capacity
    isShutdown    = source.isShutdown
    shutdown      = source.shutdown
    size          = source.size
    subscribe     = M.map_(source.subscribe, Q.mapM(g))
    publish       = (c: C) => I.bind_(f(c), (a) => source.publish(a))
    publishAll    = (cs: Iterable<C>) => I.bind_(I.foreach_(cs, f), (as) => source.publishAll(as))
  })()
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 *
 * @dataFirst dimapM_
 */
export function dimapM<A, B, C, D, EC, ED, RC, RD>(f: (c: C) => I.IO<RC, EC, A>, g: (b: B) => I.IO<RD, ED, D>) {
  return <RA, RB, EA, EB>(self: Hub<RA, RB, EA, EB, A, B>) => dimapM_(self, f, g)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): Hub<RA, RB, EA, EB, C, D> {
  return dimapM_(
    self,
    (c) => I.succeedNow(f(c)),
    (b) => I.succeedNow(g(b))
  )
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 *
 * @dataFirst dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(self: Hub<RA, RB, EA, EB, A, B>) => dimap_(self, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filter
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 */
export function filterInputM_<RA, RA1, RB, EA, EA1, EB, A, B>(
  source: Hub<RA, RB, EA, EB, A, B>,
  f: (a: A) => I.IO<RA1, EA1, boolean>
): Hub<RA & RA1, RB, EA | EA1, EB, A, B> {
  return new (class extends Hub<RA & RA1, RB, EA | EA1, EB, A, B> {
    awaitShutdown = source.awaitShutdown
    capacity      = source.capacity
    isShutdown    = source.isShutdown
    shutdown      = source.shutdown
    size          = source.size
    subscribe     = source.subscribe
    publish       = (a: A) => I.bind_(f(a), (b) => (b ? source.publish(a) : I.succeedNow(false)))
    publishAll    = (as: Iterable<A>) =>
      I.bind_(I.filter_(as, f), (as) => (C.isNonEmpty(as) ? source.publishAll(as) : I.succeedNow(false)))
  })()
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 *
 * @dataFirst filterInputM_
 */
export function filterInputM<RA1, EA1, A>(f: (a: A) => I.IO<RA1, EA1, boolean>) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => filterInputM_(self, f)
}

/**
 * Filters messages published to the hub using the specified function.
 */
export function filterInput_<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>, f: (a: A) => boolean) {
  return filterInputM_(self, (a) => I.succeedNow(f(a)))
}

/**
 * Filters messages published to the hub using the specified function.
 *
 * @dataFirst filterInput_
 */
export function filterInput<A>(f: (a: A) => boolean) {
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => filterInput_(self, f)
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 */
export function filterOutputM_<RA, RB, RB1, EA, EB, EB1, A, B>(
  source: Hub<RA, RB, EA, EB, A, B>,
  f: (a: B) => I.IO<RB1, EB1, boolean>
): Hub<RA, RB & RB1, EA, EB | EB1, A, B> {
  return new (class extends Hub<RA, RB & RB1, EA, EB | EB1, A, B> {
    awaitShutdown = source.awaitShutdown
    capacity      = source.capacity
    isShutdown    = source.isShutdown
    shutdown      = source.shutdown
    size          = source.size
    subscribe     = M.map_(source.subscribe, Q.filterOutputM(f))
    publish       = (a: A) => source.publish(a)
    publishAll    = (as: Iterable<A>) => source.publishAll(as)
  })()
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 *
 * @dataFirst filterOutputM_
 */
export function filterOutputM<RB1, EB1, B>(f: (a: B) => I.IO<RB1, EB1, boolean>) {
  return <RA, RB, EA, EB, A>(self: Hub<RA, RB, EA, EB, A, B>) => filterOutputM_(self, f)
}

/**
 * Filters messages taken from the hub using the specified function.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: Hub<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): Hub<RA, RB, EA, EB, A, B> {
  return filterOutputM_(self, (b) => I.succeedNow(f(b)))
}

/**
 * Filters messages taken from the hub using the specified function.
 *
 * @dataFirst filterOutput_
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(self: Hub<RA, RB, EA, EB, A, B>) => filterOutput_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Waits for the hub to be shut down.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<void> {
  concrete(self)
  return self.awaitShutdown
}

/**
 * The maximum capacity of the hub.
 */
export function capacity<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): number {
  concrete(self)
  return self.capacity
}

/**
 * Checks whether the hub is shut down.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<boolean> {
  concrete(self)
  return self.isShutdown
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 */
export function publish_<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>, a: A): I.IO<RA, EA, boolean> {
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
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => publish_(self, a)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 */
export function publishAll_<RA, RB, EA, EB, A, B>(
  self: Hub<RA, RB, EA, EB, A, B>,
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
  return <RA, RB, EA, EB, B>(self: Hub<RA, RB, EA, EB, A, B>) => publishAll_(self, as)
}

/**
 * Shuts down the hub.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<void> {
  concrete(self)
  return self.shutdown
}

/**
 * The current number of messages in the hub.
 */
export function size<RA, RB, EA, EB, A, B>(self: Hub<RA, RB, EA, EB, A, B>): I.UIO<number> {
  concrete(self)
  return self.size
}

/**
 * Subscribes to receive messages from the hub. The resulting subscription
 * can be evaluated multiple times within the scope of the managed to take a
 * message from the hub each time.
 */
export function subscribe<RA, RB, EA, EB, A, B>(
  self: Hub<RA, RB, EA, EB, A, B>
): M.Managed<unknown, never, HubDequeue<RB, EB, B>> {
  concrete(self)
  return self.subscribe
}

/*
 * -------------------------------------------------------------------------------------------------
 * Strategy
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A `Strategy<A>` describes the protocol for how publishers and subscribers
 * will communicate with each other through the hub.
 */
export abstract class Strategy<A> {
  /**
   * Describes how publishers should signal to subscribers that they are
   * waiting for space to become available in the hub.
   */
  abstract handleSurplus(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): I.UIO<boolean>

  /**
   * Describes any finalization logic associated with this strategy.
   */
  abstract shutdown: I.UIO<void>

  /**
   * Describes how subscribers should signal to publishers waiting for space
   * to become available in the hub that space may be available.
   */
  abstract unsafeOnHubEmptySpace(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void

  /**
   * Describes how subscribers waiting for additional values from the hub
   * should take those values and signal to publishers that they are no
   * longer waiting for additional values.
   */
  unsafeCompletePollers(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    subscription: SubscriptionInternal<A>,
    pollers: MQ.MutableQueue<P.Promise<never, A>>
  ): void {
    let keepPolling  = true
    const nullPoller = null as unknown as P.Promise<never, A>
    const empty      = null as unknown as A

    while (keepPolling && !subscription.isEmpty()) {
      const poller = pollers.poll(nullPoller)!

      if (poller === nullPoller) {
        const subPollerPair = new HashedPair(subscription, pollers)

        subscribers.remove(subPollerPair)

        if (!pollers.isEmpty) {
          subscribers.add(subPollerPair)
        }
        keepPolling = false
      } else {
        const pollResult = subscription.poll(empty)

        if (pollResult === null) {
          _unsafeOfferAll(pollers, C.prepend_(_unsafePollAllQueue(pollers), poller))
        } else {
          _unsafeCompletePromise(poller, pollResult)
          this.unsafeOnHubEmptySpace(hub, subscribers)
        }
      }
    }
  }

  /**
   * Describes how publishers should signal to subscribers waiting for
   * additional values from the hub that new values are available.
   */
  unsafeCompleteSubscribers(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    for (const { first: subscription, second: pollers } of subscribers) {
      this.unsafeCompletePollers(hub, subscribers, subscription, pollers)
    }
  }
}

/**
 * A strategy that applies back pressure to publishers when the hub is at
 * capacity. This guarantees that all subscribers will receive all messages
 * published to the hub while they are subscribed. However, it creates the
 * risk that a slow subscriber will slow down the rate at which messages
 * are published and received by other subscribers.
 */
export class BackPressure<A> extends Strategy<A> {
  publishers: MQ.MutableQueue<readonly [A, P.Promise<never, boolean>, boolean]> = new MQ.Unbounded()

  handleSurplus(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return pipe(
      I.fiberId(),
      I.bind((fiberId) =>
        I.deferTotal(() => {
          const promise = P.unsafePromise<never, boolean>(fiberId)

          return pipe(
            I.deferTotal(() => {
              this.unsafeOffer(as, promise)
              this.unsafeOnHubEmptySpace(hub, subscribers)
              this.unsafeCompleteSubscribers(hub, subscribers)

              return isShutdown.get ? I.interrupt : P.await(promise)
            }),
            I.onInterrupt(() => I.effectTotal(() => this.unsafeRemove(promise)))
          )
        })
      )
    )
  }

  get shutdown(): I.UIO<void> {
    return pipe(
      I.do,
      I.bindS('fiberId', () => I.fiberId()),
      I.bindS('publishers', () => I.effectTotal(() => _unsafePollAllQueue(this.publishers))),
      I.tap(({ fiberId, publishers }) =>
        I.foreachPar_(publishers, ([_, promise, last]) => (last ? I.asUnit(promise.interruptAs(fiberId)) : I.unit()))
      ),
      I.asUnit
    )
  }

  unsafeOnHubEmptySpace(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    const empty     = null as unknown as readonly [A, P.Promise<never, boolean>, boolean]
    let keepPolling = true

    while (keepPolling && !hub.isFull()) {
      const publisher = this.publishers.poll(empty)!

      if (publisher === null) {
        keepPolling = false
      } else {
        const published = hub.publish(publisher[0])

        if (published && publisher[2]) {
          _unsafeCompletePromise(publisher[1], true)
        } else if (!published) {
          _unsafeOfferAll(this.publishers, C.prepend_(_unsafePollAllQueue(this.publishers), publisher))
        }
        this.unsafeCompleteSubscribers(hub, subscribers)
      }
    }
  }

  private unsafeOffer(as: Iterable<A>, promise: P.Promise<never, boolean>): void {
    const it = as[Symbol.iterator]()
    let curr = it.next()

    if (!curr.done) {
      let next
      while ((next = it.next()) && !next.done) {
        this.publishers.offer([curr.value, promise, false] as const)
        curr = next
      }
      this.publishers.offer([curr.value, promise, true] as const)
    }
  }

  private unsafeRemove(promise: P.Promise<never, boolean>): void {
    _unsafeOfferAll(
      this.publishers,
      C.filter_(_unsafePollAllQueue(this.publishers), ([_, a]) => a !== promise)
    )
  }
}

/**
 * A strategy that drops new messages when the hub is at capacity. This
 * guarantees that a slow subscriber will not slow down the rate at which
 * messages are published. However, it creates the risk that a slow
 * subscriber will slow down the rate at which messages are received by
 * other subscribers and that subscribers may not receive all messages
 * published to the hub while they are subscribed.
 */
export class Dropping<A> extends Strategy<A> {
  handleSurplus(
    _hub: HubInternal<A>,
    _subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    _as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.succeedNow(false)
  }

  shutdown: I.UIO<void> = I.unit()

  unsafeOnHubEmptySpace(
    _hub: HubInternal<A>,
    _subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    //
  }
}

/**
 * A strategy that adds new messages and drops old messages when the hub is
 * at capacity. This guarantees that a slow subscriber will not slow down
 * the rate at which messages are published and received by other
 * subscribers. However, it creates the risk that a slow subscriber will
 * not receive some messages published to the hub while it is subscribed.
 */
export class Sliding<A> extends Strategy<A> {
  private unsafeSlidingPublish(hub: HubInternal<A>, as: Iterable<A>): void {
    const it = as[Symbol.iterator]()
    let next = it.next()

    if (!next.done && hub.capacity > 0) {
      let a    = next.value
      let loop = true
      while (loop) {
        hub.slide()
        const pub = hub.publish(a)
        if (pub && (next = it.next()) && !next.done) {
          a = next.value
        } else if (pub) {
          loop = false
        }
      }
    }
  }

  handleSurplus(
    hub: HubInternal<A>,
    subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.effectTotal(() => {
      this.unsafeSlidingPublish(hub, as)
      this.unsafeCompleteSubscribers(hub, subscribers)
      return true
    })
  }

  shutdown: I.UIO<void> = I.unit()

  unsafeOnHubEmptySpace(
    _hub: HubInternal<A>,
    _subscribers: HS.HashSet<HashedPair<SubscriptionInternal<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    //
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

export abstract class SubscriptionInternal<A> {
  abstract isEmpty(): boolean
  abstract poll(default_: A): A
  abstract pollUpTo(n: number): C.Chunk<A>
  abstract size(): number
  abstract unsubscribe(): void
}

export abstract class HubInternal<A> {
  abstract readonly capacity: number
  abstract isEmpty(): boolean
  abstract isFull(): boolean
  abstract publish(a: A): boolean
  abstract publishAll(as: Iterable<A>): C.Chunk<A>
  abstract size(): number
  abstract slide(): void
  abstract subscribe(): SubscriptionInternal<A>
}

/* eslint-disable functional/immutable-data */

export class BoundedHubArb<A> extends HubInternal<A> {
  array: Array<A>
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount  = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array       = Array.from({ length: requestedCapacity })
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity    = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex % this.capacity

      this.array[index]       = a
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const asArray   = C.from(as)
    const n         = asArray.length
    const size      = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub    = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex     = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a              = asArray[iteratorIndex++]!
      const index          = this.publisherIndex % this.capacity
      this.array[index]    = a
      this.publisherIndex += 1
    }

    return C.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex % this.capacity

      this.array[index]       = null as unknown as A
      this.subscribers[index] = 0
      this.subscribersIndex  += 1
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.subscriberCount += 1

    return new BoundedHubArbSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubArbSubscription<A> extends SubscriptionInternal<A> {
  constructor(private self: BoundedHubArb<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const a     = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index]      = null as unknown as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
    }

    return default_
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.unsubscribed) {
      return C.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size           = this.self.publisherIndex - this.subscriberIndex
    const toPoll         = Math.min(n, size)

    if (toPoll <= 0) {
      return C.empty()
    }

    let builder         = C.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index           = this.subscriberIndex % this.self.capacity
      const a               = this.self.array[index] as A
      builder               = C.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1
      this.subscriberIndex       = Math.max(this.subscriberIndex, this.self.subscribersIndex)

      while (this.subscriberIndex !== this.self.publisherIndex) {
        const index                   = this.subscriberIndex % this.self.capacity
        this.self.subscribers[index] -= 1

        if (this.self.subscribers[index] === 0) {
          this.self.array[index]      = null as unknown as A
          this.self.subscribersIndex += 1
        }

        this.subscriberIndex += 1
      }
    }
  }
}
export class BoundedHubPow2<A> extends HubInternal<A> {
  array: Array<A>
  mask: number
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount  = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array = Array.from({ length: requestedCapacity })
    // eslint-disable-next-line no-param-reassign
    this.mask        = requestedCapacity = 1
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity    = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex & this.mask

      this.array[index] = a

      this.subscribers[index] = this.subscriberCount
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const asArray   = C.from(as)
    const n         = asArray.length
    const size      = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub    = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex     = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a              = asArray[iteratorIndex++]!
      const index          = this.publisherIndex & this.mask
      this.array[index]    = a
      this.publisherIndex += 1
    }

    return C.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex & this.mask

      this.array[index]       = null as unknown as A
      this.subscribers[index] = 0
      this.subscribersIndex  += 1
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.subscriberCount += 1

    return new BoundedHubPow2Subcription(this, this.publisherIndex, false)
  }
}

class BoundedHubPow2Subcription<A> extends SubscriptionInternal<A> {
  constructor(private self: BoundedHubPow2<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex & this.self.mask
      const a     = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index]      = null as unknown as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
    }

    return default_
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.unsubscribed) {
      return C.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size           = this.self.publisherIndex - this.subscriberIndex
    const toPoll         = Math.min(n, size)

    if (toPoll <= 0) {
      return C.empty()
    }

    let builder         = C.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index           = this.subscriberIndex & this.self.mask
      const a               = this.self.array[index] as A
      builder               = C.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1
      this.subscriberIndex       = Math.max(this.subscriberIndex, this.self.subscribersIndex)

      while (this.subscriberIndex < this.self.publisherIndex) {
        const index                   = this.subscriberIndex & this.self.mask
        this.self.subscribers[index] -= 1

        if (this.self.subscribers[index] === 0) {
          this.self.array[index]      = null as unknown as A
          this.self.subscribersIndex += 1
        }

        this.subscriberIndex += 1
      }
    }
  }
}

export class BoundedHubSingle<A> extends HubInternal<A> {
  publisherIndex  = 0
  subscriberCount = 0
  subscribers     = 0
  value: A        = null as unknown as A

  readonly capacity = 1

  constructor() {
    super()
  }

  isEmpty(): boolean {
    return this.subscribers === 0
  }

  isFull(): boolean {
    return !this.isEmpty()
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      this.value           = a
      this.subscribers     = this.subscriberCount
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const list = C.from(as)

    if (C.isEmpty(list)) {
      return C.empty()
    }

    if (this.publish(C.unsafeHead(list)!)) {
      return C.drop_(list, 1)
    } else {
      return list
    }
  }

  size(): number {
    return this.isEmpty() ? 0 : 1
  }

  slide(): void {
    if (this.isFull()) {
      this.subscribers = 0
      this.value       = null as unknown as A
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.subscriberCount += 1

    return new BoundedHubSingleSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubSingleSubscription<A> extends SubscriptionInternal<A> {
  constructor(private self: BoundedHubSingle<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return this.unsubscribed || this.self.subscribers === 0 || this.subscriberIndex === this.self.publisherIndex
  }

  poll(default_: A): A {
    if (this.isEmpty()) {
      return default_
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }

    this.subscriberIndex += 1

    return a
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.isEmpty() || n < 1) {
      return C.empty()
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }

    this.subscriberIndex += 1

    return C.single(a)
  }

  size() {
    return this.isEmpty() ? 0 : 1
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1

      if (this.subscriberIndex !== this.self.publisherIndex) {
        this.self.subscribers -= 1

        if (this.self.subscribers === 0) {
          this.self.value = null as unknown as A
        }
      }
    }
  }
}

class Node<A> {
  constructor(public value: A | null, public subscribers: number, public next: Node<A> | null) {}
}

export class UnboundedHub<A> extends HubInternal<A> {
  publisherHead  = new Node<A>(null, 0, null)
  publisherIndex = 0
  publisherTail: Node<A>
  subscribersIndex = 0

  readonly capacity = Number.MAX_SAFE_INTEGER

  constructor() {
    super()

    this.publisherTail = this.publisherHead
  }

  isEmpty(): boolean {
    return this.publisherHead === this.publisherTail
  }

  isFull(): boolean {
    return false
  }

  publish(a: A): boolean {
    const subscribers = this.publisherTail.subscribers

    if (subscribers !== 0) {
      this.publisherTail.next = new Node(a, subscribers, null)
      this.publisherTail      = this.publisherTail.next
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    for (const a of as) {
      this.publish(a)
    }
    return C.empty()
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.publisherHead !== this.publisherTail) {
      this.publisherHead       = this.publisherHead.next!
      this.publisherHead.value = null
      this.subscribersIndex   += 1
    }
  }

  subscribe(): SubscriptionInternal<A> {
    this.publisherTail.subscribers += 1

    return new UnboundedHubSubscription(this, this.publisherTail, this.publisherIndex, false)
  }
}

class UnboundedHubSubscription<A> extends SubscriptionInternal<A> {
  constructor(
    private self: UnboundedHub<A>,
    private subscriberHead: Node<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
    super()
  }

  isEmpty(): boolean {
    if (this.unsubscribed) {
      return true
    }

    let empty = true
    let loop  = true

    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        if (this.subscriberHead.next!.value !== null) {
          empty = false
          loop  = false
        } else {
          this.subscriberHead   = this.subscriberHead.next!
          this.subscriberIndex += 1
        }
      }
    }

    return empty
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    let loop   = true
    let polled = default_

    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        const a = this.subscriberHead.next!.value

        if (a !== null) {
          polled                           = a
          this.subscriberHead.subscribers -= 1

          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead       = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex   += 1
          }

          loop = false
        }

        this.subscriberHead   = this.subscriberHead.next!
        this.subscriberIndex += 1
      }
    }

    return polled
  }

  pollUpTo(n: number): C.Chunk<A> {
    let builder    = C.empty<A>()
    const default_ = null
    let i          = 0

    while (i !== n) {
      const a = this.poll(default_ as unknown as A)
      if (a === default_) {
        i = n
      } else {
        builder = C.append_(builder, a)
        i      += 1
      }
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed                    = true
      this.self.publisherTail.subscribers -= 1

      while (this.subscriberHead !== this.self.publisherTail) {
        if (this.subscriberHead.next!.value !== null) {
          this.subscriberHead.subscribers -= 1

          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead       = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex   += 1
          }
        }
        this.subscriberHead = this.subscriberHead.next!
      }
    }
  }
}

export class HashedPair<A, B> implements St.Hashable, St.Equatable {
  constructor(readonly first: A, readonly second: B) {}

  get [St.$hash]() {
    return St._combineHash(St.hash(this.first), St.hash(this.second))
  }

  [St.$equals](that: unknown) {
    return that instanceof HashedPair && St.equals(this.first, that.first) && St.equals(this.second, that.second)
  }
}

export class InvalidCapacityError extends Error {
  readonly _tag = 'InvalidCapacityError'

  constructor(message?: string) {
    super(message)
    this.name = this._tag
  }
}

function _ensureCapacity(capacity: number): asserts capacity {
  if (capacity <= 0) {
    throw new InvalidCapacityError(`A Hub cannot have a capacity of ${capacity}`)
  }
}

function _isInvalidCapacityError(u: unknown): u is InvalidCapacityError {
  return u instanceof Error && '_tag' in u && u['_tag'] === 'InvalidCapacityError'
}

function _nextPow2(n: number): number {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2.0))

  return Math.max(Math.pow(2, nextPow), 2)
}

export function _makeBounded<A>(requestedCapacity: number): HubInternal<A> {
  _ensureCapacity(requestedCapacity)

  if (requestedCapacity === 1) {
    return new BoundedHubSingle()
  } else if (_nextPow2(requestedCapacity) === requestedCapacity) {
    return new BoundedHubPow2(requestedCapacity)
  } else {
    return new BoundedHubArb(requestedCapacity)
  }
}

export function _makeUnbounded<A>(): HubInternal<A> {
  return new UnboundedHub()
}

/**
 * Unsafely completes a promise with the specified value.
 */
export function _unsafeCompletePromise<A>(promise: P.Promise<never, A>, a: A): void {
  P.unsafeDone(I.succeedNow(a))(promise)
}

/**
 * Unsafely offers the specified values to a queue.
 */
export function _unsafeOfferAll<A>(queue: MutableQueue<A>, as: Iterable<A>): C.Chunk<A> {
  return queue.offerAll(as)
}

/**
 * Unsafely polls all values from a queue.
 */
export function _unsafePollAllQueue<A>(queue: MutableQueue<A>): C.Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls all values from a subscription.
 */
export function _unsafePollAllSubscription<A>(subscription: SubscriptionInternal<A>): C.Chunk<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls the specified number of values from a subscription.
 */
export function _unsafePollN<A>(subscription: SubscriptionInternal<A>, max: number): C.Chunk<A> {
  return subscription.pollUpTo(max)
}

/**
 * Unsafely publishes the specified values to a hub.
 */
export function _unsafePublishAll<A>(hub: HubInternal<A>, as: Iterable<A>): C.Chunk<A> {
  return hub.publishAll(as)
}

/**
 * Unsafely removes the specified item from a queue.
 */
export function _unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  _unsafeOfferAll(
    queue,
    C.filter_(_unsafePollAllQueue(queue), (_) => _ !== a)
  )
}
