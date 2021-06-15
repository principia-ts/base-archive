import type { Chunk } from '../Chunk'
import type { IO, UIO } from '../IO'
import type { Promise } from '../Promise'
import type { MutableQueue } from '../util/support/MutableQueue'

import * as C from '../Chunk/core'
import { flow, identity, pipe } from '../function'
import * as O from '../Option'
import * as P from '../Promise'
import { tuple } from '../tuple'
import { AtomicBoolean } from '../util/support/AtomicBoolean'
import { Bounded, Unbounded } from '../util/support/MutableQueue'
import * as I from './internal/io'

/**
 * A `Queue<RA, RB, EA, EB, A, B>` is a lightweight, asynchronous queue into which values of
 * type `A` can be enqueued and of which elements of type `B` can be dequeued. The queue's
 * enqueueing operations may utilize an environment of type `RA` and may fail with errors of
 * type `EA`. The dequeueing operations may utilize an environment of type `RB` and may fail
 * with errors of type `EB`.
 */
export abstract class Queue<RA, RB, EA, EB, A, B> {
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
export interface UQueue<A> extends Queue<unknown, unknown, never, never, A, A> {}

/**
 * A queue that can only be dequeued.
 */
export interface Dequeue<A> extends Queue<never, unknown, unknown, never, never, A> {}

/**
 * A queue that can only be enqueued.
 */
export interface Enqueue<A> extends Queue<unknown, never, never, unknown, A, any> {}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function slidingQueue<A>(capacity: number): I.UIO<UQueue<A>> {
  return I.bind_(
    I.effectTotal(() => new Bounded<A>(capacity)),
    _queue(new SlidingStrategy())
  )
}

export function unboundedQueue<A>(): I.UIO<UQueue<A>> {
  return I.bind_(
    I.effectTotal(() => new Unbounded<A>()),
    _queue(new DroppingStrategy())
  )
}

export function droppingQueue<A>(capacity: number): I.UIO<UQueue<A>> {
  return I.bind_(
    I.effectTotal(() => new Bounded<A>(capacity)),
    _queue(new DroppingStrategy())
  )
}

export function boundedQueue<A>(capacity: number): I.UIO<UQueue<A>> {
  return I.bind_(
    I.effectTotal(() => new Bounded<A>(capacity)),
    _queue(new BackPressureStrategy())
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Take
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export function takeBetween(min: number, max: number) {
  return <RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>): I.IO<RB, EB, Chunk<B>> => {
    function takeRemaining(n: number): I.IO<RB, EB, Chunk<B>> {
      if (n <= 0) {
        return I.pure(C.empty())
      } else {
        return I.bind_(queue.take, (a) => I.map_(takeRemaining(n - 1), C.prepend(a)))
      }
    }

    if (max < min) {
      return I.pure(C.empty())
    } else {
      return pipe(
        queue.takeUpTo(max),
        I.bind((bs) => {
          const remaining = min - bs.length

          if (remaining === 1) {
            return I.map_(queue.take, (b) => C.append_(bs, b))
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
  queue: Queue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number
): I.IO<RB, EB, Chunk<B>> {
  return takeBetween(min, max)(queue)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>): UIO<void> {
  return queue.awaitShutdown
}

/**
 * How many elements can hold in the queue
 */
export function capacity<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>): number {
  return queue.capacity
}

/**
 * `true` if `shutdown` has been called.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>): UIO<boolean> {
  return queue.isShutdown
}

/**
 * Places one value in the queue.
 */
export function offer_<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>, a: A): I.IO<RA, EA, boolean> {
  return queue.offer(a)
}

/**
 * Places one value in the queue.
 */
export function offer<A>(a: A): <RA, RB, EA, EB, B>(queue: Queue<RA, RB, EA, EB, A, B>) => I.IO<RA, EA, boolean> {
  return (queue) => queue.offer(a)
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
export function offerAll_<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>, as: Iterable<A>) {
  return queue.offerAll(as)
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
): <RA, RB, EA, EB, B>(queue: Queue<RA, RB, EA, EB, A, B>) => I.IO<RA, EA, boolean> {
  return (queue) => queue.offerAll(as)
}

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export function shutdown<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>) {
  return queue.shutdown
}

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export function size<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>) {
  return queue.size
}

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export function take<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>) {
  return queue.take
}

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export function takeAll<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>) {
  return queue.takeAll
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo_<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>, n: number) {
  return queue.takeUpTo(n)
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo(
  n: number
): <RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>) => I.IO<RB, EB, Chunk<B>> {
  return (queue) => queue.takeUpTo(n)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Zip
 * -------------------------------------------------------------------------------------------------
 */

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
  queue: Queue<RA, RB, EA, EB, A, B>,
  that: Queue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => I.IO<R3, E3, D>
): Queue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
  return new (class extends Queue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
    awaitShutdown: I.UIO<void>                                            = I.bind_(queue.awaitShutdown, () => that.awaitShutdown)
    capacity: number                                                      = Math.min(queue.capacity, that.capacity)
    isShutdown: I.UIO<boolean>                                            = queue.isShutdown
    offer: (a: A1) => I.IO<RA & RA1, EA1 | EA, boolean>                   = (a) =>
      I.crossWithPar_(queue.offer(a), that.offer(a), (x, y) => x && y)
    offerAll: (as: Iterable<A1>) => I.IO<RA & RA1, EA1 | EA, boolean>     = (as) =>
      I.crossWithPar_(queue.offerAll(as), that.offerAll(as), (x, y) => x && y)
    shutdown: I.UIO<void>                                                 = I.crossWithPar_(queue.shutdown, that.shutdown, () => undefined)
    size: I.UIO<number>                                                   = I.crossWithPar_(queue.size, that.size, (x, y) => Math.max(x, y))
    take: I.IO<RB & RB1 & R3, E3 | EB | EB1, D>                           = I.bind_(I.crossPar_(queue.take, that.take), ([b, c]) => f(b, c))
    takeAll: I.IO<RB & RB1 & R3, E3 | EB | EB1, Chunk<D>>                 = I.bind_(
      I.crossPar_(queue.takeAll, that.takeAll),
      ([bs, cs]) => I.foreach_(C.zip_(bs, cs), ([b, c]) => f(b, c))
    )
    takeUpTo: (n: number) => I.IO<RB & RB1 & R3, E3 | EB | EB1, Chunk<D>> = (max) =>
      pipe(
        queue.takeUpTo(max),
        I.crossPar(that.takeUpTo(max)),
        I.bind(([bs, cs]) => I.foreach_(C.zip_(bs, cs), ([b, c]) => f(b, c)))
      )
  })()
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
  that: Queue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => I.IO<R3, E3, D>
): <RA, RB, EA, EB>(
  queue: Queue<RA, RB, EA, EB, A, B>
) => Queue<RA & RA1, RB & RB1 & R3, EA1 | EA, EB1 | EB | E3, A1, D> {
  return (queue) => zipWithM_(queue, that, f)
}

/**
 * Like `zipWithM`, but uses a pure function.
 */
export function zipWith_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  that: Queue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
): Queue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, D> {
  return zipWithM_(queue, that, (b, c) => I.pure(f(b, c)))
}

/**
 * Like `zipWithM`, but uses a pure function.
 */
export function zipWith<RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  that: Queue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
): <RA, RB, EA, EB>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA & RA1, RB & RB1, EA1 | EA, EB1 | EB, A1, D> {
  return (queue) => zipWithM_(queue, that, (b, c) => I.pure(f(b, c)))
}

/**
 * Like `zipWith`, but tuples the elements instead of applying a function.
 */
export function zip_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  that: Queue<RA1, RB1, EA1, EB1, A1, C>
): Queue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, readonly [B, C]> {
  return zipWith_(queue, that, (b, c) => tuple(b, c))
}

/**
 * Like `zipWith`, but tuples the elements instead of applying a function.
 */
export function zip<RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  that: Queue<RA1, RB1, EA1, EB1, A1, C>
): <RA, RB, EA, EB>(
  queue: Queue<RA, RB, EA, EB, A, B>
) => Queue<RA & RA1, RB & RB1, EA1 | EA, EB1 | EB, A1, readonly [B, C]> {
  return (queue) => zipWith_(queue, that, (b, c) => tuple(b, c))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(self: Queue<RA, RB, EA, EB, A, B>, f: (c: C) => A, g: (b: B) => D) {
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
export function dimap<A, B, C, D>(
  f: (c: C) => A,
  g: (b: B) => D
): <RA, RB, EA, EB>(self: Queue<RA, RB, EA, EB, A, B>) => Queue<RA, RB, EA, EB, C, D> {
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
export function dimapM_<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): Queue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
  return new (class extends Queue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
    awaitShutdown: I.UIO<void>                                     = queue.awaitShutdown
    capacity: number                                               = queue.capacity
    isShutdown: I.UIO<boolean>                                     = queue.isShutdown
    offer: (a: C) => I.IO<RC & RA, EA | EC, boolean>               = (c) => I.bind_(f(c), queue.offer)
    offerAll: (as: Iterable<C>) => I.IO<RC & RA, EC | EA, boolean> = (cs) => I.bind_(I.foreach_(cs, f), queue.offerAll)
    shutdown: I.UIO<void>                                          = queue.shutdown
    size: I.UIO<number>                                            = queue.size
    take: I.IO<RD & RB, ED | EB, D>                                = I.bind_(queue.take, g)
    takeAll: I.IO<RD & RB, ED | EB, Chunk<D>>                      = I.bind_(queue.takeAll, I.foreach(g))
    takeUpTo: (n: number) => I.IO<RD & RB, ED | EB, Chunk<D>>      = flow(queue.takeUpTo, I.bind(I.foreach(g)))
  })()
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimapM<A, B, C, RC, EC, RD, ED, D>(
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): <RA, RB, EA, EB>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
  return (queue) => dimapM_(queue, f, g)
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 */
export function contramapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): Queue<RA & RC, RB, EA | EC, EB, C, B> {
  return dimapM_(queue, f, I.pure)
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 */
export function contramapM<C, RA2, EA2, A>(
  f: (c: C) => I.IO<RA2, EA2, A>
): <RA, RB, EA, EB, B>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA2 & RA, RB, EA | EA2, EB, C, B> {
  return (queue) => dimapM_(queue, f, I.pure)
}

export function contramap_<RA, RB, EA, EB, A, B, C>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): Queue<RA, RB, EA, EB, C, B> {
  return contramapM_(queue, flow(f, I.pure))
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA, RB, EA, EB, C, B> {
  return (queue) => contramap_(queue, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filter
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, A1 extends A, R2, E2>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => I.IO<R2, E2, boolean>
): Queue<RA & R2, RB, EA | E2, EB, A1, B> {
  return new (class extends Queue<RA & R2, RB, EA | E2, EB, A1, B> {
    awaitShutdown: I.UIO<void>                                      = queue.awaitShutdown
    capacity: number                                                = queue.capacity
    isShutdown: I.UIO<boolean>                                      = queue.isShutdown
    offer: (a: A1) => I.IO<RA & R2, EA | E2, boolean>               = (a) =>
      I.bind_(f(a), (b) => (b ? queue.offer(a) : I.pure(false)))
    offerAll: (as: Iterable<A1>) => I.IO<RA & R2, EA | E2, boolean> = (as) =>
      pipe(
        as,
        I.foreach((a) =>
          pipe(
            f(a),
            I.map((b) => (b ? O.some(a) : O.none()))
          )
        ),
        I.bind((maybeAs) => {
          const filtered = C.filterMap_(maybeAs, identity)

          if (C.isEmpty(filtered)) {
            return I.pure(false)
          } else {
            return queue.offerAll(filtered)
          }
        })
      )
    shutdown: I.UIO<void>                           = queue.shutdown
    size: I.UIO<number>                             = queue.size
    take: I.IO<RB, EB, B>                           = queue.take
    takeAll: I.IO<RB, EB, Chunk<B>>                 = queue.takeAll
    takeUpTo: (n: number) => I.IO<RB, EB, Chunk<B>> = (max) => queue.takeUpTo(max)
  })()
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 */
export function filterInputM<A, A1 extends A, R2, E2>(
  f: (_: A1) => I.IO<R2, E2, boolean>
): <RA, RB, EA, EB, B>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA & R2, RB, E2 | EA, EB, A1, B> {
  return (queue) => filterInputM_(queue, f)
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => boolean
): Queue<RA, RB, EA, EB, A1, B> {
  return filterInputM_(queue, (a) => I.pure(f(a)))
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput<A, A1 extends A>(
  f: (_: A1) => boolean
): <RA, RB, EA, EB, B>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA, RB, EA, EB, A1, B> {
  return (queue) => filterInputM_(queue, (a) => I.pure(f(a)))
}

export function filterOutputM_<RA, RB, EA, EB, A, B, RB1, EB1>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (b: B) => IO<RB1, EB1, boolean>
): Queue<RA, RB & RB1, EA, EB | EB1, A, B> {
  return new (class extends Queue<RA, RB & RB1, EA, EB | EB1, A, B> {
    awaitShutdown: UIO<void>                  = queue.awaitShutdown
    capacity: number                          = queue.capacity
    isShutdown: UIO<boolean>                  = queue.isShutdown
    offer                                     = (a: A): IO<RA, EA, boolean> => queue.offer(a)
    offerAll                                  = (as: Iterable<A>): IO<RA, EA, boolean> => queue.offerAll(as)
    shutdown: UIO<void>                       = queue.shutdown
    size: UIO<number>                         = queue.size
    take: IO<RB & RB1, EB1 | EB, B>           = I.bind_(queue.take, (b) =>
      I.bind_(f(b), (p) => (p ? I.succeedNow(b) : this.take))
    )
    takeAll: IO<RB & RB1, EB | EB1, Chunk<B>> = I.bind_(queue.takeAll, (bs) => I.filter_(bs, f))
    loop                                      = (max: number, acc: Chunk<B>): IO<RB & RB1, EB | EB1, Chunk<B>> =>
      I.bind_(queue.takeUpTo(max), (bs) => {
        if (C.isEmpty(bs)) {
          return I.succeedNow(acc)
        }

        return I.bind_(I.filter_(bs, f), (filtered) => {
          const length = filtered.length

          if (length === max) {
            return I.succeedNow(C.concat_(acc, filtered))
          } else {
            return this.loop(max - length, C.concat_(acc, filtered))
          }
        })
      })
    takeUpTo = (n: number): IO<RB & RB1, EB | EB1, C.Chunk<B>> => I.deferTotal(() => this.loop(n, C.empty()))
  })()
}

export function filterOutputM<B, RB1, EB1>(
  f: (b: B) => IO<RB1, EB1, boolean>
): <RA, RB, EA, EB, A>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA, RB & RB1, EA, EB | EB1, A, B> {
  return (queue) => filterOutputM_(queue, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms elements dequeued from this queue with an effectful function.
 */
export function mapM_<RA, RB, EA, EB, A, B, R2, E2, C>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<R2, E2, C>
): Queue<RA, R2 & RB, EA, EB | E2, A, C> {
  return dimapM_(queue, I.pure, f)
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 */
export function mapM<B, R2, E2, C>(
  f: (b: B) => I.IO<R2, E2, C>
): <RA, RB, EA, EB, A>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA, R2 & RB, EA, EB | E2, A, C> {
  return (queue) => mapM_(queue, f)
}

export function map_<RA, RB, EA, EB, A, B, C>(
  queue: Queue<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): Queue<RA, RB, EA, EB, A, C> {
  return mapM_(queue, flow(f, I.succeedNow))
}

export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(queue: Queue<RA, RB, EA, EB, A, B>) => Queue<RA, RB, EA, EB, A, C> {
  return (queue) => map_(queue, f)
}

/**
 * Take the head option of values in the queue.
 */
export function poll<RA, RB, EA, EB, A, B>(queue: Queue<RA, RB, EA, EB, A, B>): IO<RB, EB, O.Option<B>> {
  return I.map_(queue.takeUpTo(1), C.head)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 */

function _unsafeQueue<A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): UQueue<A> {
  return new (class extends Queue<unknown, unknown, never, never, A, A> {
    awaitShutdown: I.UIO<void>                     = shutdownHook.await
    capacity: number                               = queue.capacity
    isShutdown: I.UIO<boolean>                     = I.effectTotal(() => shutdownFlag.get)
    offer: (a: A) => I.IO<unknown, never, boolean> = (a) =>
      I.deferTotal(() => {
        if (shutdownFlag.get) {
          return I.interrupt
        } else {
          const taker = takers.poll(undefined)

          if (taker != null) {
            _unsafeCompletePromise(taker, a)
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
          const pTakers                = queue.isEmpty ? _unsafePollN(takers, arr.length) : C.empty<Promise<never, A>>()
          const [forTakers, remaining] = C.splitAt_(arr, pTakers.length)
          pipe(
            pTakers,
            C.zip(forTakers),
            C.foreach(([taker, item]) => {
              _unsafeCompletePromise(taker, item)
            })
          )

          if (remaining.length === 0) {
            return I.pure(true)
          }

          const surplus = _unsafeOfferAll(queue, remaining)

          _unsafeCompleteTakers(strategy, queue, takers)

          if (surplus.length === 0) {
            return I.pure(true)
          } else {
            return strategy.handleSurplus(surplus, queue, takers, shutdownFlag)
          }
        }
      })
    }
    shutdown: I.UIO<void>         = I.descriptorWith((d) =>
      I.deferTotal(() => {
        shutdownFlag.set(true)

        return I.makeUninterruptible(
          I.whenM(shutdownHook.succeed(undefined))(
            I.bind_(I.foreachPar_(_unsafePollAll(takers), P.interruptAs(d.id)), () => strategy.shutdown)
          )
        )
      })
    )
    size: I.UIO<number>           = I.deferTotal(() => {
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
          const p = P.unsafePromise<never, A>(d.id)

          return I.onInterrupt_(
            I.deferTotal(() => {
              takers.offer(p)
              _unsafeCompleteTakers(strategy, queue, takers)
              if (shutdownFlag.get) {
                return I.interrupt
              } else {
                return p.await
              }
            }),
            () => I.effectTotal(() => _unsafeRemove(takers, p))
          )
        }
      })
    )
    takeAll: I.IO<unknown, never, Chunk<A>> = I.deferTotal(() => {
      if (shutdownFlag.get) {
        return I.interrupt
      } else {
        return I.effectTotal(() => {
          const as = _unsafePollAll(queue)
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
            const as = _unsafePollN(queue, max)
            strategy.unsafeOnQueueEmptySpace(queue)
            return as
          })
        }
      })
  })()
}

function _queue<A>(strategy: Strategy<A>): (queue: MutableQueue<A>) => I.IO<unknown, never, UQueue<A>> {
  return (queue) =>
    I.map_(P.promise<never, void>(), (p) => _unsafeQueue(queue, new Unbounded(), p, new AtomicBoolean(false), strategy))
}

function _unsafeOfferAll<A>(q: MutableQueue<A>, as: Chunk<A>): Chunk<A> {
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

function _unsafePollAll<A>(q: MutableQueue<A>): Chunk<A> {
  let as = C.empty<A>()

  while (!q.isEmpty) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    as = C.append_(as, q.poll(undefined)!)
  }

  return as
}

function _unsafeCompletePromise<A>(p: Promise<never, A>, a: A) {
  return p.unsafeDone(I.pure(a))
}

function _unsafeRemove<A>(q: MutableQueue<A>, a: A) {
  C.filter_(_unsafeOfferAll(q, _unsafePollAll(q)), (b) => a !== b)
}

function _unsafePollN<A>(q: MutableQueue<A>, max: number): Chunk<A> {
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

function _unsafeCompleteTakers<A>(
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
        _unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue)
      } else {
        _unsafeOfferAll(takers, C.prepend_(_unsafePollAll(takers), taker))
      }

      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Strategy
 * -------------------------------------------------------------------------------------------------
 */

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
        const p = P.unsafePromise<never, boolean>(d.id)

        return I.onInterrupt_(
          I.deferTotal(() => {
            this.unsafeOffer(as, p)
            this.unsafeOnQueueEmptySpace(queue)
            _unsafeCompleteTakers(this, queue, takers)
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
    _unsafeOfferAll(
      this.putters,
      C.filter_(_unsafePollAll(this.putters), ([_, __]) => __ !== p)
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
          _unsafeCompletePromise(putter[1], true)
        } else if (!offered) {
          _unsafeOfferAll(this.putters, C.prepend_(_unsafePollAll(this.putters), putter))
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
      const putters = yield* _(I.effectTotal(() => _unsafePollAll(self.putters)))
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
      _unsafeCompleteTakers(this, queue, takers)
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
