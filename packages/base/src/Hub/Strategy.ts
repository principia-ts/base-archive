import type * as HS from '../MutableHashSet'
import type { AtomicBoolean } from '../util/support/AtomicBoolean'
import type * as InternalHub from './internal'

import * as Chunk from '../Chunk'
import { pipe } from '../function'
import * as T from '../IO'
import * as P from '../Promise'
import * as MQ from '../util/support/MutableQueue'
import { HashedPair } from './internal'
import * as _ from './internal'

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
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): T.UIO<boolean>

  /**
   * Describes any finalization logic associated with this strategy.
   */
  abstract shutdown: T.UIO<void>

  /**
   * Describes how subscribers should signal to publishers waiting for space
   * to become available in the hub that space may be available.
   */
  abstract unsafeOnHubEmptySpace(
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void

  /**
   * Describes how subscribers waiting for additional values from the hub
   * should take those values and signal to publishers that they are no
   * longer waiting for additional values.
   */
  unsafeCompletePollers(
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    subscription: InternalHub.Subscription<A>,
    pollers: MQ.MutableQueue<P.Promise<never, A>>
  ): void {
    let keepPolling  = true
    const nullPoller = (null as unknown) as P.Promise<never, A>
    const empty      = (null as unknown) as A

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
          _.unsafeOfferAll(pollers, Chunk.prepend_(_.unsafePollAllQueue(pollers), poller))
        } else {
          _.unsafeCompletePromise(poller, pollResult)
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
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>
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
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): T.UIO<boolean> {
    return pipe(
      T.fiberId(),
      T.bind((fiberId) =>
        T.deferTotal(() => {
          const promise = P.unsafeMake<never, boolean>(fiberId)

          return pipe(
            T.deferTotal(() => {
              this.unsafeOffer(as, promise)
              this.unsafeOnHubEmptySpace(hub, subscribers)
              this.unsafeCompleteSubscribers(hub, subscribers)

              return isShutdown.get ? T.interrupt : P.await(promise)
            }),
            T.onInterrupt(() => T.effectTotal(() => this.unsafeRemove(promise)))
          )
        })
      )
    )
  }

  get shutdown(): T.UIO<void> {
    return pipe(
      T.do,
      T.bindS('fiberId', () => T.fiberId()),
      T.bindS('publishers', () => T.effectTotal(() => _.unsafePollAllQueue(this.publishers))),
      T.tap(({ fiberId, publishers }) =>
        T.foreachPar_(publishers, ([_, promise, last]) => (last ? T.asUnit(promise.interruptAs(fiberId)) : T.unit()))
      ),
      T.asUnit
    )
  }

  unsafeOnHubEmptySpace(
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    const empty     = (null as unknown) as readonly [A, P.Promise<never, boolean>, boolean]
    let keepPolling = true

    while (keepPolling && !hub.isFull()) {
      const publisher = this.publishers.poll(empty)!

      if (publisher === null) {
        keepPolling = false
      } else {
        const published = hub.publish(publisher[0])

        if (published && publisher[2]) {
          _.unsafeCompletePromise(publisher[1], true)
        } else if (!published) {
          _.unsafeOfferAll(this.publishers, Chunk.prepend_(_.unsafePollAllQueue(this.publishers), publisher))
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
    _.unsafeOfferAll(
      this.publishers,
      Chunk.filter_(_.unsafePollAllQueue(this.publishers), ([_, a]) => a !== promise)
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
    _hub: InternalHub.Hub<A>,
    _subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    _as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): T.UIO<boolean> {
    return T.succeed(false)
  }

  shutdown: T.UIO<void> = T.unit()

  unsafeOnHubEmptySpace(
    _hub: InternalHub.Hub<A>,
    _subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>
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
  private unsafeSlidingPublish(hub: InternalHub.Hub<A>, as: Iterable<A>): void {
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
    hub: InternalHub.Hub<A>,
    subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>,
    as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): T.UIO<boolean> {
    return T.effectTotal(() => {
      this.unsafeSlidingPublish(hub, as)
      this.unsafeCompleteSubscribers(hub, subscribers)
      return true
    })
  }

  shutdown: T.UIO<void> = T.unit()

  unsafeOnHubEmptySpace(
    _hub: InternalHub.Hub<A>,
    _subscribers: HS.HashSet<HashedPair<InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>>>
  ): void {
    //
  }
}
