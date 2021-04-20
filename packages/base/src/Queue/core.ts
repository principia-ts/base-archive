import type { Chunk } from '../Chunk'
import type { IO, UIO } from '../IO'
import type { Promise } from '../Promise'
import type { MutableQueue } from '../util/support/MutableQueue'

import { flow, identity, pipe } from '@principia/prelude/function'
import { tuple } from '@principia/prelude/tuple'

import * as C from '../Chunk/core'
import * as O from '../Option'
import * as P from '../Promise'
import { AtomicBoolean } from '../util/support/AtomicBoolean'
import { Bounded, Unbounded } from '../util/support/MutableQueue'
import * as I from './internal/io'

/**
 * A `XQueue<RA, RB, EA, EB, A, B>` is a lightweight, asynchronous queue into which values of
 * type `A` can be enqueued and of which elements of type `B` can be dequeued. The queue's
 * enqueueing operations may utilize an environment of type `RA` and may fail with errors of
 * type `EA`. The dequeueing operations may utilize an environment of type `RB` and may fail
 * with errors of type `EB`.
 */
export abstract class XQueue<RA, RB, EA, EB, A, B> {
  /**
   * Waits until the queue is shutdown.
   * The `IO` returned by this method will not resume until the queue has been shutdown.
   * If the queue is already shutdown, the `IO` will resume right away.
   */
  abstract readonly awaitShutdown: UIO<void>
  /**
   * How many elements can hold in the queue
   */
  abstract readonly capacity: number
  /**
   * `true` if `shutdown` has been called.
   */
  abstract readonly isShutdown: UIO<boolean>
  /**
   * Places one value in the queue.
   */
  abstract readonly offer: (a: A) => IO<RA, EA, boolean>
  /**
   * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
   * If the queue has reached capacity, then
   * the fiber performing the `offerAll` will be suspended until there is room in
   * the queue.
   *
   * For Unbounded Queue:
   * Places all values in the queue and returns true.
   *
   * For Sliding Queue: uses `Sliding` Strategy
   * If there is room in the queue, it places the values otherwise it removes the old elements and
   * enqueues the new ones. Always returns true.
   *
   * For Dropping Queue: uses `Dropping` Strategy,
   * It places the values in the queue but if there is no room it will not enqueue them and return false.
   *
   */
  abstract readonly offerAll: (as: Iterable<A>) => IO<RA, EA, boolean>
  /**
   * Interrupts any fibers that are suspended on `offer` or `take`.
   * Future calls to `offer*` and `take*` will be interrupted immediately.
   */
  abstract readonly shutdown: UIO<void>
  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  abstract readonly size: UIO<number>
  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */
  abstract readonly take: IO<RB, EB, B>
  /**
   * Removes all the values in the queue and returns the list of the values. If the queue
   * is empty returns empty list.
   */
  abstract readonly takeAll: IO<RB, EB, Chunk<B>>
  /**
   * Takes up to max number of values in the queue.
   */
  abstract readonly takeUpTo: (n: number) => IO<RB, EB, Chunk<B>>
}

/**
 * A `Queue<A>` is a lightweight, asynchronous queue into which
 * values of type `A` can be enqueued and dequeued.
 */
export interface Queue<A> extends XQueue<unknown, unknown, never, never, A, A> {}

/**
 * A queue that can only be dequeued.
 */
export interface Dequeue<A> extends XQueue<never, unknown, unknown, never, never, A> {}

export function unsafeOfferAll<A>(q: MutableQueue<A>, as: Chunk<A>): Chunk<A> {
  let bs = as

  while (bs.length > 0) {
    if (!q.offer(C.unsafeGet_(bs, 0))) {
      return bs
    } else {
      bs = C.drop_(bs, 1)
    }
  }

  return bs
}

export function unsafePollAll<A>(q: MutableQueue<A>): Chunk<A> {
  let as = C.empty<A>()

  while (!q.isEmpty) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    as = C.append_(as, q.poll(undefined)!)
  }

  return as
}

export function unsafeCompletePromise<A>(p: Promise<never, A>, a: A) {
  return p.unsafeDone(I.pure(a))
}

export function unsafeRemove<A>(q: MutableQueue<A>, a: A) {
  C.filter_(unsafeOfferAll(q, unsafePollAll(q)), (b) => a !== b)
}

export function unsafePollN<A>(q: MutableQueue<A>, max: number): Chunk<A> {
  let j  = 0
  let as = C.empty<A>()

  while (j < max) {
    const p = q.poll(undefined)

    if (p != null) {
      as = C.append_(as, p)
    } else {
      return as
    }

    j += 1
  }

  return as
}

export function unsafeCompleteTakers<A>(
  strategy: Strategy<A>,
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>
) {
  let keepPolling = true

  while (keepPolling && !queue.isEmpty) {
    const taker = takers.poll(undefined)

    if (taker != null) {
      const element = queue.poll(undefined)

      if (element != null) {
        unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue)
      } else {
        unsafeOfferAll(takers, C.prepend_(unsafePollAll(takers), taker))
      }

      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}

export interface Strategy<A> {
  readonly handleSurplus: (
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ) => I.UIO<boolean>

  readonly unsafeOnQueueEmptySpace: (queue: MutableQueue<A>) => void

  readonly surplusSize: number

  readonly shutdown: I.UIO<void>
}

export class BackPressureStrategy<A> implements Strategy<A> {
  private putters = new Unbounded<[A, Promise<never, boolean>, boolean]>()

  handleSurplus(
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.descriptorWith((d) =>
      I.deferTotal(() => {
        const p = P.unsafeMake<never, boolean>(d.id)

        return I.onInterrupt_(
          I.deferTotal(() => {
            this.unsafeOffer(as, p)
            this.unsafeOnQueueEmptySpace(queue)
            unsafeCompleteTakers(this, queue, takers)
            if (isShutdown.get) {
              return I.interrupt
            } else {
              return p.await
            }
          }),
          () => I.effectTotal(() => this.unsafeRemove(p))
        )
      })
    )
  }

  unsafeRemove(p: Promise<never, boolean>) {
    unsafeOfferAll(
      this.putters,
      C.filter_(unsafePollAll(this.putters), ([_, __]) => __ !== p)
    )
  }

  unsafeOffer(as: Chunk<A>, p: Promise<never, boolean>) {
    let bs = as

    while (bs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const head = C.unsafeGet_(bs, 0)
      bs         = C.drop_(bs, 1)

      if (bs.length === 0) {
        this.putters.offer([head, p, true])
      } else {
        this.putters.offer([head, p, false])
      }
    }
  }

  unsafeOnQueueEmptySpace(queue: MutableQueue<A>) {
    let keepPolling = true

    while (keepPolling && !queue.isFull) {
      const putter = this.putters.poll(undefined)

      if (putter != null) {
        const offered = queue.offer(putter[0])

        if (offered && putter[2]) {
          unsafeCompletePromise(putter[1], true)
        } else if (!offered) {
          unsafeOfferAll(this.putters, C.prepend_(unsafePollAll(this.putters), putter))
        }
      } else {
        keepPolling = false
      }
    }
  }

  get shutdown(): I.UIO<void> {
    const self = this
    return I.gen(function* (_) {
      const fiberId = yield* _(I.fiberId())
      const putters = yield* _(I.effectTotal(() => unsafePollAll(self.putters)))
      yield* _(I.foreachPar_(putters, ([, p, lastItem]) => (lastItem ? I.asUnit(p.interruptAs(fiberId)) : I.unit())))
    })
  }

  get surplusSize(): number {
    return this.putters.size
  }
}

export class DroppingStrategy<A> implements Strategy<A> {
  handleSurplus(
    _as: Chunk<A>,
    _queue: MutableQueue<A>,
    _takers: MutableQueue<Promise<never, A>>,
    _isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.pure(false)
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
    //
  }

  get shutdown(): I.UIO<void> {
    return I.unit()
  }

  get surplusSize(): number {
    return 0
  }
}

export class SlidingStrategy<A> implements Strategy<A> {
  handleSurplus(
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    _isShutdown: AtomicBoolean
  ): I.UIO<boolean> {
    return I.effectTotal(() => {
      this.unsafeSlidingOffer(queue, as)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
    //
  }

  get shutdown(): I.UIO<void> {
    return I.unit()
  }

  get surplusSize(): number {
    return 0
  }

  private unsafeSlidingOffer(queue: MutableQueue<A>, as: Chunk<A>) {
    let bs = as

    while (bs.length > 0) {
      if (queue.capacity === 0) {
        return
      }
      // poll 1 and retry
      queue.poll(undefined)

      if (queue.offer(C.unsafeGet_(bs, 0))) {
        bs = C.drop_(bs, 1)
      }
    }
  }
}

export function unsafeCreate<A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Queue<A> {
  return new (class extends XQueue<unknown, unknown, never, never, A, A> {
    awaitShutdown: I.UIO<void> = shutdownHook.await

    capacity: number = queue.capacity

    isShutdown: I.UIO<boolean> = I.effectTotal(() => shutdownFlag.get)

    offer: (a: A) => I.IO<unknown, never, boolean> = (a) =>
      I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        } else {
          const taker = takers.poll(undefined)

          if (taker != null) {
            unsafeCompletePromise(taker, a)
            return I.pure(true)
          } else {
            const succeeded = queue.offer(a)

            if (succeeded) {
              return I.pure(true)
            } else {
              return strategy.handleSurplus(C.single(a), queue, takers, shutdownFlag)
            }
          }
        }
      })

    offerAll: (as: Iterable<A>) => I.IO<unknown, never, boolean> = (as) => {
      const arr = C.from(as)
      return I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        } else {
          const pTakers                = queue.isEmpty ? unsafePollN(takers, arr.length) : C.empty<Promise<never, A>>()
          const [forTakers, remaining] = C.splitAt_(arr, pTakers.length)
          pipe(
            pTakers,
            C.zip(forTakers),
            C.foreach(([taker, item]) => {
              unsafeCompletePromise(taker, item)
            })
          )

          if (remaining.length === 0) {
            return I.pure(true)
          }

          const surplus = unsafeOfferAll(queue, remaining)

          unsafeCompleteTakers(strategy, queue, takers)

          if (surplus.length === 0) {
            return I.pure(true)
          } else {
            return strategy.handleSurplus(surplus, queue, takers, shutdownFlag)
          }
        }
      })
    }

    shutdown: I.UIO<void> = I.descriptorWith((d) =>
      I.deferTotal(() => {
        shutdownFlag.set(true)

        return I.makeUninterruptible(
          I.whenM(shutdownHook.succeed(undefined))(
            I.bind_(I.foreachPar_(unsafePollAll(takers), P.interruptAs(d.id)), () => strategy.shutdown)
          )
        )
      })
    )

    size: I.UIO<number> = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      } else {
        return I.pure(queue.size - takers.size + strategy.surplusSize)
      }
    })

    take: I.IO<unknown, never, A> = I.descriptorWith((d) =>
      I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        }

        const item = queue.poll(undefined)

        if (item != null) {
          strategy.unsafeOnQueueEmptySpace(queue)
          return I.pure(item)
        } else {
          const p = P.unsafeMake<never, A>(d.id)

          return I.onInterrupt_(
            I.deferTotal(() => {
              takers.offer(p)
              unsafeCompleteTakers(strategy, queue, takers)
              if (shutdownFlag.get) {
                return I.interrupt
              } else {
                return p.await
              }
            }),
            () => I.effectTotal(() => unsafeRemove(takers, p))
          )
        }
      })
    )

    takeAll: I.IO<unknown, never, Chunk<A>> = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      } else {
        return I.effectTotal(() => {
          const as = unsafePollAll(queue)
          strategy.unsafeOnQueueEmptySpace(queue)
          return as
        })
      }
    })

    takeUpTo: (n: number) => I.IO<unknown, never, Chunk<A>> = (max) =>
      I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        } else {
          return I.effectTotal(() => {
            const as = unsafePollN(queue, max)
            strategy.unsafeOnQueueEmptySpace(queue)
            return as
          })
        }
      })
  })()
}

export function createQueue<A>(strategy: Strategy<A>): (queue: MutableQueue<A>) => I.IO<unknown, never, Queue<A>> {
  return (queue) =>
    I.map_(P.make<never, void>(), (p) => unsafeCreate(queue, new Unbounded(), p, new AtomicBoolean(false), strategy))
}

export function makeSliding<A>(capacity: number): I.UIO<Queue<A>> {
  return I.bind_(
    I.effectTotal(() => new Bounded<A>(capacity)),
    createQueue(new SlidingStrategy())
  )
}

export function makeUnbounded<A>(): I.UIO<Queue<A>> {
  return I.bind_(
    I.effectTotal(() => new Unbounded<A>()),
    createQueue(new DroppingStrategy())
  )
}

export function makeDropping<A>(capacity: number): I.UIO<Queue<A>> {
  return I.bind_(
    I.effectTotal(() => new Bounded<A>(capacity)),
    createQueue(new DroppingStrategy())
  )
}

export function makeBounded<A>(capacity: number): I.UIO<Queue<A>> {
  return I.bind_(
    I.effectTotal(() => new Bounded<A>(capacity)),
    createQueue(new BackPressureStrategy())
  )
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export function takeBetween(min: number, max: number) {
  return <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>): I.IO<RB, EB, Chunk<B>> => {
    function takeRemaining(n: number): I.IO<RB, EB, Chunk<B>> {
      if (n <= 0) {
        return I.pure(C.empty())
      } else {
        return I.bind_(self.take, (a) => I.map_(takeRemaining(n - 1), C.prepend(a)))
      }
    }

    if (max < min) {
      return I.pure(C.empty())
    } else {
      return pipe(
        self.takeUpTo(max),
        I.bind((bs) => {
          const remaining = min - bs.length

          if (remaining === 1) {
            return I.map_(self.take, (b) => C.append_(bs, b))
          } else if (remaining > 1) {
            return I.map_(takeRemaining(remaining - 1), (list) => C.concat_(bs, list))
          } else {
            return I.pure(bs)
          }
        })
      )
    }
  }
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export function takeBetween_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number
): I.IO<RB, EB, Chunk<B>> {
  return takeBetween(min, max)(self)
}

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.awaitShutdown
}

/**
 * How many elements can hold in the queue
 */
export function capacity<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.capacity
}

/**
 * `true` if `shutdown` has been called.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.isShutdown
}

/**
 * Places one value in the queue.
 */
export function offer<A>(a: A): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => I.IO<RA, EA, boolean> {
  return (self) => self.offer(a)
}

/**
 * Places one value in the queue.
 */
export function offer_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, a: A): I.IO<RA, EA, boolean> {
  return self.offer(a)
}

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 */
export function offerAll<A>(
  as: Iterable<A>
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => I.IO<RA, EA, boolean> {
  return (self) => self.offerAll(as)
}

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 */
export function offerAll_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, as: Iterable<A>) {
  return self.offerAll(as)
}

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.shutdown
}

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export function size<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.size
}

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export function take<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.take
}

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export function takeAll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.takeAll
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo(
  n: number
): <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) => I.IO<RB, EB, Chunk<B>> {
  return (self) => self.takeUpTo(n)
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, n: number) {
  return self.takeUpTo(n)
}

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 */
export function zipWithM<RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => I.IO<R3, E3, D>
): <RA, RB, EA, EB>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => XQueue<RA & RA1, RB & RB1 & R3, EA1 | EA, EB1 | EB | E3, A1, D> {
  return (self) => zipWithM_(self, that, f)
}

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 */
export function zipWithM_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => I.IO<R3, E3, D>
): XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
  return new (class extends XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
    awaitShutdown: I.UIO<void> = I.bind_(self.awaitShutdown, () => that.awaitShutdown)

    capacity: number = Math.min(self.capacity, that.capacity)

    isShutdown: I.UIO<boolean> = self.isShutdown

    offer: (a: A1) => I.IO<RA & RA1, EA1 | EA, boolean> = (a) =>
      I.crossWithPar_(self.offer(a), that.offer(a), (x, y) => x && y)

    offerAll: (as: Iterable<A1>) => I.IO<RA & RA1, EA1 | EA, boolean> = (as) =>
      I.crossWithPar_(self.offerAll(as), that.offerAll(as), (x, y) => x && y)

    shutdown: I.UIO<void> = I.crossWithPar_(self.shutdown, that.shutdown, () => undefined)

    size: I.UIO<number> = I.crossWithPar_(self.size, that.size, (x, y) => Math.max(x, y))

    take: I.IO<RB & RB1 & R3, E3 | EB | EB1, D> = I.bind_(I.crossPar_(self.take, that.take), ([b, c]) => f(b, c))

    takeAll: I.IO<RB & RB1 & R3, E3 | EB | EB1, Chunk<D>> = I.bind_(
      I.crossPar_(self.takeAll, that.takeAll),
      ([bs, cs]) => I.foreach_(C.zip_(bs, cs), ([b, c]) => f(b, c))
    )

    takeUpTo: (n: number) => I.IO<RB & RB1 & R3, E3 | EB | EB1, Chunk<D>> = (max) =>
      pipe(
        self.takeUpTo(max),
        I.crossPar(that.takeUpTo(max)),
        I.bind(([bs, cs]) => I.foreach_(C.zip_(bs, cs), ([b, c]) => f(b, c)))
      )
  })()
}

/**
 * Like `zipWithM`, but uses a pure function.
 */
export function zipWith<RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
): <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA & RA1, RB & RB1, EA1 | EA, EB1 | EB, A1, D> {
  return (self) => zipWithM_(self, that, (b, c) => I.pure(f(b, c)))
}

/**
 * Like `zipWithM`, but uses a pure function.
 */
export function zipWith_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
): XQueue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, D> {
  return zipWithM_(self, that, (b, c) => I.pure(f(b, c)))
}

/**
 * Like `zipWith`, but tuples the elements instead of applying a function.
 */
export function zip<RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
): <RA, RB, EA, EB>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => XQueue<RA & RA1, RB & RB1, EA1 | EA, EB1 | EB, A1, readonly [B, C]> {
  return (self) => zipWith_(self, that, (b, c) => tuple(b, c))
}

/**
 * Like `zipWith`, but tuples the elements instead of applying a function.
 */
export function zip_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) {
  return zipWith_(self, that, (b, c) => tuple(b, c))
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimap<A, B, C, D>(
  f: (c: C) => A,
  g: (b: B) => D
): <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, C, D> {
  return (self) =>
    dimapM_(
      self,
      (c: C) => I.pure(f(c)),
      (b) => I.pure(g(b))
    )
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(self: XQueue<RA, RB, EA, EB, A, B>, f: (c: C) => A, g: (b: B) => D) {
  return dimapM_(
    self,
    (c: C) => I.pure(f(c)),
    (b) => I.pure(g(b))
  )
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimapM<A, B, C, RC, EC, RD, ED, D>(
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
  return (self) => dimapM_(self, f, g)
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
  return new (class extends XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
    awaitShutdown: I.UIO<void> = self.awaitShutdown

    capacity: number = self.capacity

    isShutdown: I.UIO<boolean> = self.isShutdown

    offer: (a: C) => I.IO<RC & RA, EA | EC, boolean> = (c) => I.bind_(f(c), self.offer)

    offerAll: (as: Iterable<C>) => I.IO<RC & RA, EC | EA, boolean> = (cs) => I.bind_(I.foreach_(cs, f), self.offerAll)

    shutdown: I.UIO<void> = self.shutdown

    size: I.UIO<number> = self.size

    take: I.IO<RD & RB, ED | EB, D> = I.bind_(self.take, g)

    takeAll: I.IO<RD & RB, ED | EB, Chunk<D>> = I.bind_(self.takeAll, I.foreach(g))

    takeUpTo: (n: number) => I.IO<RD & RB, ED | EB, Chunk<D>> = flow(self.takeUpTo, I.bind(I.foreach(g)))
  })()
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 */
export function contramapM<C, RA2, EA2, A>(f: (c: C) => I.IO<RA2, EA2, A>) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => dimapM_(self, f, I.pure)
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, C, B> {
  return (self) => dimapM_(self, (c: C) => I.pure(f(c)), I.pure)
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 */
export function filterInputM<A, A1 extends A, R2, E2>(
  f: (_: A1) => I.IO<R2, E2, boolean>
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA & R2, RB, E2 | EA, EB, A1, B> {
  return (self) => filterInputM_(self, f)
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, A1 extends A, R2, E2>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => I.IO<R2, E2, boolean>
): XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
  return new (class extends XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
    awaitShutdown: I.UIO<void> = self.awaitShutdown

    capacity: number = self.capacity

    isShutdown: I.UIO<boolean> = self.isShutdown

    offer: (a: A1) => I.IO<RA & R2, EA | E2, boolean> = (a) => I.bind_(f(a), (b) => (b ? self.offer(a) : I.pure(false)))

    offerAll: (as: Iterable<A1>) => I.IO<RA & R2, EA | E2, boolean> = (as) =>
      pipe(
        as,
        I.foreach((a) =>
          pipe(
            f(a),
            I.map((b) => (b ? O.Some(a) : O.None()))
          )
        ),
        I.bind((maybeAs) => {
          const filtered = C.filterMap_(maybeAs, identity)

          if (C.isEmpty(filtered)) {
            return I.pure(false)
          } else {
            return self.offerAll(filtered)
          }
        })
      )

    shutdown: I.UIO<void> = self.shutdown

    size: I.UIO<number> = self.size

    take: I.IO<RB, EB, B> = self.take

    takeAll: I.IO<RB, EB, Chunk<B>> = self.takeAll

    takeUpTo: (n: number) => I.IO<RB, EB, Chunk<B>> = (max) => self.takeUpTo(max)
  })()
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput<A, A1 extends A>(
  f: (_: A1) => boolean
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, A1, B> {
  return (self) => filterInputM_(self, (a) => I.pure(f(a)))
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => boolean
): XQueue<RA, RB, EA, EB, A1, B> {
  return filterInputM_(self, (a) => I.pure(f(a)))
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 */
export function mapM<B, R2, E2, C>(f: (b: B) => I.IO<R2, E2, C>) {
  return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) => dimapM_(self, (a: A) => I.pure(a), f)
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 */
export function mapM_<RA, RB, EA, EB, A, B, R2, E2, C>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<R2, E2, C>
): XQueue<RA, R2 & RB, EA, EB | E2, A, C> {
  return dimapM_(self, (a: A) => I.pure(a), f)
}

export function map_<RA, RB, EA, EB, A, B, C>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XQueue<RA, RB, EA, EB, A, C> {
  return mapM_(self, flow(f, I.succeed))
}

export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, A, C> {
  return (self) => map_(self, f)
}

/**
 * Take the head option of values in the queue.
 */
export function poll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>): IO<RB, EB, O.Option<B>> {
  return I.map_(self.takeUpTo(1), C.head)
}
