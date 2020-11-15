/* eslint-disable @typescript-eslint/no-use-before-define */

import * as A from "../../Array/_core";
import { identity, pipe, tuple } from "../../Function";
import * as O from "../../Option";
import * as T from "./_internal/task";
import { XQueue } from "./model";

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export function takeBetween(min: number, max: number) {
   return <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>): T.Task<RB, EB, readonly B[]> => {
      function takeRemaining(n: number): T.Task<RB, EB, ReadonlyArray<B>> {
         if (n <= 0) {
            return T.pure([]);
         } else {
            return T.chain_(self.take, (a) => T.map_(takeRemaining(n - 1), (_) => [a, ..._]));
         }
      }

      if (max < min) {
         return T.pure([]);
      } else {
         return pipe(
            self.takeUpTo(max),
            T.chain((bs) => {
               const remaining = min - bs.length;

               if (remaining === 1) {
                  return T.map_(self.take, (b) => [...bs, b]);
               } else if (remaining > 1) {
                  return T.map_(takeRemaining(remaining - 1), (list) => [...bs, ...A.reverse(list)]);
               } else {
                  return T.pure(bs);
               }
            })
         );
      }
   };
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
): T.Task<RB, EB, readonly B[]> {
   return takeBetween(min, max)(self);
}

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.awaitShutdown;
}

/**
 * How many elements can hold in the queue
 */
export function capacity<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.capacity;
}

/**
 * `true` if `shutdown` has been called.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.isShutdown;
}

/**
 * Places one value in the queue.
 */
export function offer<A>(a: A): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => T.Task<RA, EA, boolean> {
   return (self) => self.offer(a);
}

/**
 * Places one value in the queue.
 */
export function offer_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, a: A): T.Task<RA, EA, boolean> {
   return self.offer(a);
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
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => T.Task<RA, EA, boolean> {
   return (self) => self.offerAll(as);
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
   return self.offerAll(as);
}

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.shutdown;
}

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export function size<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.size;
}

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export function take<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.take;
}

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export function takeAll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return self.takeAll;
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo(
   n: number
): <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) => T.Task<RB, EB, readonly B[]> {
   return (self) => self.takeUpTo(n);
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, n: number) {
   return self.takeUpTo(n);
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
export function mapBothM<RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
   that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
   f: (b: B, c: C) => T.Task<R3, E3, D>
): <RA, RB, EA, EB>(
   self: XQueue<RA, RB, EA, EB, A, B>
) => XQueue<RA & RA1, RB & RB1 & R3, EA1 | EA, EB1 | EB | E3, A1, D> {
   return (self) => mapBothM_(self, that, f);
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
export function mapBothM_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
   f: (b: B, c: C) => T.Task<R3, E3, D>
): XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
   return new (class extends XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
      awaitShutdown: T.IO<void> = T.chain_(self.awaitShutdown, () => that.awaitShutdown);

      capacity: number = Math.min(self.capacity, that.capacity);

      isShutdown: T.IO<boolean> = self.isShutdown;

      offer: (a: A1) => T.Task<RA & RA1, EA1 | EA, boolean> = (a) =>
         T.mapBothPar_(self.offer(a), that.offer(a), (x, y) => x && y);

      offerAll: (as: Iterable<A1>) => T.Task<RA & RA1, EA1 | EA, boolean> = (as) =>
         T.mapBothPar_(self.offerAll(as), that.offerAll(as), (x, y) => x && y);

      shutdown: T.IO<void> = T.mapBothPar_(self.shutdown, that.shutdown, () => undefined);

      size: T.IO<number> = T.mapBothPar_(self.size, that.size, (x, y) => Math.max(x, y));

      take: T.Task<RB & RB1 & R3, E3 | EB | EB1, D> = T.chain_(T.bothPar_(self.take, that.take), ([b, c]) => f(b, c));

      takeAll: T.Task<RB & RB1 & R3, E3 | EB | EB1, readonly D[]> = T.chain_(
         T.bothPar_(self.takeAll, that.takeAll),
         ([bs, cs]) => {
            const abs = Array.from(bs);
            const acs = Array.from(cs);
            const all = A.zip_(abs, acs);

            return T.foreach_(all, ([b, c]) => f(b, c));
         }
      );

      takeUpTo: (n: number) => T.Task<RB & RB1 & R3, E3 | EB | EB1, readonly D[]> = (max) =>
         T.chain_(T.bothPar_(self.takeUpTo(max), that.takeUpTo(max)), ([bs, cs]) => {
            const abs = Array.from(bs);
            const acs = Array.from(cs);
            const all = A.zip_(abs, acs);

            return T.foreach_(all, ([b, c]) => f(b, c));
         });
   })();
}

/**
 * Like `bothWithM`, but uses a pure function.
 */
export function mapBoth<RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
   that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
   f: (b: B, c: C) => D
): <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA & RA1, RB & RB1, EA1 | EA, EB1 | EB, A1, D> {
   return (self) => mapBothM_(self, that, (b, c) => T.pure(f(b, c)));
}

/**
 * Like `bothWithM`, but uses a pure function.
 */
export function mapBoth_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
   f: (b: B, c: C) => D
): XQueue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, D> {
   return mapBothM_(self, that, (b, c) => T.pure(f(b, c)));
}

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 */
export function both<RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
   that: XQueue<RA1, RB1, EA1, EB1, A1, C>
): <RA, RB, EA, EB>(
   self: XQueue<RA, RB, EA, EB, A, B>
) => XQueue<RA & RA1, RB & RB1, EA1 | EA, EB1 | EB, A1, readonly [B, C]> {
   return (self) => mapBoth_(self, that, (b, c) => tuple(b, c));
}

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 */
export function both_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) {
   return mapBoth_(self, that, (b, c) => tuple(b, c));
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function bimap<A, B, C, D>(
   f: (c: C) => A,
   g: (b: B) => D
): <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, C, D> {
   return (self) =>
      bimapM_(
         self,
         (c: C) => T.pure(f(c)),
         (b) => T.pure(g(b))
      );
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function bimap_<RA, RB, EA, EB, A, B, C, D>(self: XQueue<RA, RB, EA, EB, A, B>, f: (c: C) => A, g: (b: B) => D) {
   return bimapM_(
      self,
      (c: C) => T.pure(f(c)),
      (b) => T.pure(g(b))
   );
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function bimapM<A, B, C, RC, EC, RD, ED, D>(
   f: (c: C) => T.Task<RC, EC, A>,
   g: (b: B) => T.Task<RD, ED, D>
): <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
   return (self) => bimapM_(self, f, g);
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function bimapM_<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   f: (c: C) => T.Task<RC, EC, A>,
   g: (b: B) => T.Task<RD, ED, D>
): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
   return new (class extends XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
      awaitShutdown: T.IO<void> = self.awaitShutdown;

      capacity: number = self.capacity;

      isShutdown: T.IO<boolean> = self.isShutdown;

      offer: (a: C) => T.Task<RC & RA, EA | EC, boolean> = (c) => T.chain_(f(c), self.offer);

      offerAll: (as: Iterable<C>) => T.Task<RC & RA, EC | EA, boolean> = (cs) =>
         T.chain_(T.foreach_(cs, f), self.offerAll);

      shutdown: T.IO<void> = self.shutdown;

      size: T.IO<number> = self.size;

      take: T.Task<RD & RB, ED | EB, D> = T.chain_(self.take, g);

      takeAll: T.Task<RD & RB, ED | EB, readonly D[]> = T.chain_(self.takeAll, (a) => T.foreach_(a, g));

      takeUpTo: (n: number) => T.Task<RD & RB, ED | EB, readonly D[]> = (max) =>
         T.chain_(self.takeUpTo(max), (bs) => T.foreach_(bs, g));
   })();
}

/**
 * Transforms elements enqueued into this queue with a taskful function.
 */
export function contramapM<C, RA2, EA2, A>(f: (c: C) => T.Task<RA2, EA2, A>) {
   return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => bimapM_(self, f, T.pure);
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 */
export function contramap<C, A>(
   f: (c: C) => A
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, C, B> {
   return (self) => bimapM_(self, (c: C) => T.pure(f(c)), T.pure);
}

/**
 * Like `filterInput`, but uses a taskful function to filter the elements.
 */
export function filterInputM<A, A1 extends A, R2, E2>(
   f: (_: A1) => T.Task<R2, E2, boolean>
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA & R2, RB, E2 | EA, EB, A1, B> {
   return (self) => filterInputM_(self, f);
}

/**
 * Like `filterInput`, but uses a taskful function to filter the elements.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, A1 extends A, R2, E2>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   f: (_: A1) => T.Task<R2, E2, boolean>
): XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
   return new (class extends XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
      awaitShutdown: T.IO<void> = self.awaitShutdown;

      capacity: number = self.capacity;

      isShutdown: T.IO<boolean> = self.isShutdown;

      offer: (a: A1) => T.Task<RA & R2, EA | E2, boolean> = (a) =>
         T.chain_(f(a), (b) => (b ? self.offer(a) : T.pure(false)));

      offerAll: (as: Iterable<A1>) => T.Task<RA & R2, EA | E2, boolean> = (as) =>
         pipe(
            as,
            T.foreach((a) =>
               pipe(
                  f(a),
                  T.map((b) => (b ? O.some(a) : O.none()))
               )
            ),
            T.chain((maybeAs) => {
               const filtered = A.mapOption_(maybeAs, identity);

               if (A.isEmpty(filtered)) {
                  return T.pure(false);
               } else {
                  return self.offerAll(filtered);
               }
            })
         );

      shutdown: T.IO<void> = self.shutdown;

      size: T.IO<number> = self.size;

      take: T.Task<RB, EB, B> = self.take;

      takeAll: T.Task<RB, EB, readonly B[]> = self.takeAll;

      takeUpTo: (n: number) => T.Task<RB, EB, readonly B[]> = (max) => self.takeUpTo(max);
   })();
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput<A, A1 extends A>(
   f: (_: A1) => boolean
): <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => XQueue<RA, RB, EA, EB, A1, B> {
   return (self) => filterInputM_(self, (a) => T.pure(f(a)));
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   f: (_: A1) => boolean
): XQueue<RA, RB, EA, EB, A1, B> {
   return filterInputM_(self, (a) => T.pure(f(a)));
}

/**
 * Transforms elements dequeued from this queue with a taskful function.
 */
export function mapM<B, R2, E2, C>(f: (b: B) => T.Task<R2, E2, C>) {
   return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) => bimapM_(self, (a: A) => T.pure(a), f);
}

/**
 * Transforms elements dequeued from this queue with a taskful function.
 */
export function mapM_<RA, RB, EA, EB, A, B, R2, E2, C>(
   self: XQueue<RA, RB, EA, EB, A, B>,
   f: (b: B) => T.Task<R2, E2, C>
): XQueue<RA, R2 & RB, EA, EB | E2, A, C> {
   return bimapM_(self, (a: A) => T.pure(a), f);
}

/**
 * Take the head option of values in the queue.
 */
export function poll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
   return T.map_(self.takeUpTo(1), A.head);
}
