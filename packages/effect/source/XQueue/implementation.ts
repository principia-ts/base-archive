import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";

import type { MutableQueue } from "../Support";
import { AtomicBoolean, Bounded, Unbounded } from "../Support";
import type { XPromise } from "../XPromise";
import * as XP from "../XPromise";
import * as T from "./_internal/effect";
import type { Queue } from "./XQueue";
import { XQueue } from "./XQueue";

export const unsafeOfferAll = <A>(q: MutableQueue<A>, as: readonly A[]): readonly A[] => {
   const bs = Array.from(as);

   while (bs.length > 0) {
      if (!q.offer(bs[0])) {
         return bs;
      } else {
         bs.shift();
      }
   }

   return bs;
};

export const unsafePollAll = <A>(q: MutableQueue<A>): readonly A[] => {
   const as = [] as A[];

   while (!q.isEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      as.push(q.poll(undefined)!);
   }

   return as;
};

export const unsafeCompletePromise = <A>(p: XPromise<never, A>, a: A) => XP.unsafeDone(T.pure(a))(p);

export const unsafeRemove = <A>(q: MutableQueue<A>, a: A) => {
   unsafeOfferAll(q, unsafePollAll(q)).filter((b) => a !== b);
};

export const unsafePollN = <A>(q: MutableQueue<A>, max: number): readonly A[] => {
   let j = 0;
   const as = [] as A[];

   while (j < max) {
      const p = q.poll(undefined);

      if (p != null) {
         as.push(p);
      } else {
         return as;
      }

      j += 1;
   }

   return as;
};

export const unsafeCompleteTakers = <A>(
   strategy: Strategy<A>,
   queue: MutableQueue<A>,
   takers: MutableQueue<XPromise<never, A>>
) => {
   let keepPolling = true;

   while (keepPolling && !queue.isEmpty) {
      const taker = takers.poll(undefined);

      if (taker != null) {
         const element = queue.poll(undefined);

         if (element != null) {
            unsafeCompletePromise(taker, element);
            strategy.unsafeOnQueueEmptySpace(queue);
         } else {
            unsafeOfferAll(takers, [taker, ...unsafePollAll(takers)]);
         }

         keepPolling = true;
      } else {
         keepPolling = false;
      }
   }
};

export interface Strategy<A> {
   readonly handleSurplus: (
      as: readonly A[],
      queue: MutableQueue<A>,
      takers: MutableQueue<XPromise<never, A>>,
      isShutdown: AtomicBoolean
   ) => T.UIO<boolean>;

   readonly unsafeOnQueueEmptySpace: (queue: MutableQueue<A>) => void;

   readonly surplusSize: number;

   readonly shutdown: T.UIO<void>;
}

export class BackPressureStrategy<A> implements Strategy<A> {
   private putters = new Unbounded<[A, XPromise<never, boolean>, boolean]>();

   handleSurplus(
      as: readonly A[],
      queue: MutableQueue<A>,
      takers: MutableQueue<XPromise<never, A>>,
      isShutdown: AtomicBoolean
   ): T.UIO<boolean> {
      return T.checkDescriptor((d) =>
         T.suspend(() => {
            const p = XP.unsafeMake<never, boolean>(d.id);

            return T.onInterrupt_(
               T.suspend(() => {
                  this.unsafeOffer(as, p);
                  this.unsafeOnQueueEmptySpace(queue);
                  unsafeCompleteTakers(this, queue, takers);
                  if (isShutdown.get) {
                     return T.interrupt;
                  } else {
                     return XP.await(p);
                  }
               }),
               () => T.total(() => this.unsafeRemove(p))
            );
         })
      );
   }

   unsafeRemove(p: XPromise<never, boolean>) {
      unsafeOfferAll(
         this.putters,
         unsafePollAll(this.putters).filter(([_, __]) => __ !== p)
      );
   }

   unsafeOffer(as: readonly A[], p: XPromise<never, boolean>) {
      const bs = Array.from(as);

      while (bs.length > 0) {
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const head = bs.shift()!;

         if (bs.length === 0) {
            this.putters.offer([head, p, true]);
         } else {
            this.putters.offer([head, p, false]);
         }
      }
   }

   unsafeOnQueueEmptySpace(queue: MutableQueue<A>) {
      let keepPolling = true;

      while (keepPolling && !queue.isFull) {
         const putter = this.putters.poll(undefined);

         if (putter != null) {
            const offered = queue.offer(putter[0]);

            if (offered && putter[2]) {
               unsafeCompletePromise(putter[1], true);
            } else if (!offered) {
               unsafeOfferAll(this.putters, [putter, ...unsafePollAll(this.putters)]);
            }
         } else {
            keepPolling = false;
         }
      }
   }

   get shutdown(): T.UIO<void> {
      return pipe(
         T.of,
         T.bindS("fiberId", () => T.checkFiberId()),
         T.bindS("putters", () => T.total(() => unsafePollAll(this.putters))),
         T.tap((s) =>
            T.foreachPar_(s.putters, ([_, p, lastItem]) => (lastItem ? XP.interruptAs(s.fiberId)(p) : T.unit))
         ),
         T.asUnit
      );
   }

   get surplusSize(): number {
      return this.putters.size;
   }
}

export class DroppingStrategy<A> implements Strategy<A> {
   handleSurplus(
      _as: readonly A[],
      _queue: MutableQueue<A>,
      _takers: MutableQueue<XPromise<never, A>>,
      _isShutdown: AtomicBoolean
   ): T.UIO<boolean> {
      return T.pure(false);
   }

   unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
      //
   }

   get shutdown(): T.UIO<void> {
      return T.unit;
   }

   get surplusSize(): number {
      return 0;
   }
}

export class SlidingStrategy<A> implements Strategy<A> {
   handleSurplus(
      as: readonly A[],
      queue: MutableQueue<A>,
      takers: MutableQueue<XPromise<never, A>>,
      _isShutdown: AtomicBoolean
   ): T.UIO<boolean> {
      return T.total(() => {
         this.unsafeSlidingOffer(queue, as);
         unsafeCompleteTakers(this, queue, takers);
         return true;
      });
   }

   unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
      //
   }

   get shutdown(): T.UIO<void> {
      return T.unit;
   }

   get surplusSize(): number {
      return 0;
   }

   private unsafeSlidingOffer(queue: MutableQueue<A>, as: readonly A[]) {
      const bs = Array.from(as);

      while (bs.length > 0) {
         if (queue.capacity === 0) {
            return;
         }
         // poll 1 and retry
         queue.poll(undefined);

         if (queue.offer(bs[0])) {
            bs.shift();
         }
      }
   }
}

export const unsafeCreate = <A>(
   queue: MutableQueue<A>,
   takers: MutableQueue<XPromise<never, A>>,
   shutdownHook: XPromise<never, void>,
   shutdownFlag: AtomicBoolean,
   strategy: Strategy<A>
): Queue<A> =>
   new (class extends XQueue<unknown, unknown, never, never, A, A> {
      awaitShutdown: T.UIO<void> = XP.await(shutdownHook);

      capacity: number = queue.capacity;

      isShutdown: T.UIO<boolean> = T.total(() => shutdownFlag.get);

      offer: (a: A) => T.Effect<unknown, never, boolean> = (a) =>
         T.suspend(() => {
            if (shutdownFlag.get) {
               return T.interrupt;
            } else {
               const taker = takers.poll(undefined);

               if (taker != null) {
                  unsafeCompletePromise(taker, a);
                  return T.pure(true);
               } else {
                  const succeeded = queue.offer(a);

                  if (succeeded) {
                     return T.pure(true);
                  } else {
                     return strategy.handleSurplus([a], queue, takers, shutdownFlag);
                  }
               }
            }
         });

      offerAll: (as: Iterable<A>) => T.Effect<unknown, never, boolean> = (as) => {
         const arr = Array.from(as);
         return T.suspend(() => {
            if (shutdownFlag.get) {
               return T.interrupt;
            } else {
               const pTakers = queue.isEmpty ? unsafePollN(takers, arr.length) : [];
               const [forTakers, remaining] = A.splitAt(pTakers.length)(arr);

               A.zip(forTakers)(pTakers).forEach(([taker, item]) => {
                  unsafeCompletePromise(taker, item);
               });

               if (remaining.length === 0) {
                  return T.pure(true);
               }

               const surplus = unsafeOfferAll(queue, remaining);

               unsafeCompleteTakers(strategy, queue, takers);

               if (surplus.length === 0) {
                  return T.pure(true);
               } else {
                  return strategy.handleSurplus(surplus, queue, takers, shutdownFlag);
               }
            }
         });
      };

      shutdown: T.UIO<void> = T.checkDescriptor((d) =>
         T.suspend(() => {
            shutdownFlag.set(true);

            return T.makeUninterruptible(
               T.whenM(XP.succeed<void>(undefined)(shutdownHook))(
                  T.chain_(T.foreachPar_(unsafePollAll(takers), XP.interruptAs(d.id)), () => strategy.shutdown)
               )
            );
         })
      );

      size: T.UIO<number> = T.suspend(() => {
         if (shutdownFlag.get) {
            return T.interrupt;
         } else {
            return T.pure(queue.size - takers.size + strategy.surplusSize);
         }
      });

      take: T.Effect<unknown, never, A> = T.checkDescriptor((d) =>
         T.suspend(() => {
            if (shutdownFlag.get) {
               return T.interrupt;
            }

            const item = queue.poll(undefined);

            if (item != null) {
               strategy.unsafeOnQueueEmptySpace(queue);
               return T.pure(item);
            } else {
               const p = XP.unsafeMake<never, A>(d.id);

               return T.onInterrupt_(
                  T.suspend(() => {
                     takers.offer(p);
                     unsafeCompleteTakers(strategy, queue, takers);
                     if (shutdownFlag.get) {
                        return T.interrupt;
                     } else {
                        return XP.await(p);
                     }
                  }),
                  () => T.total(() => unsafeRemove(takers, p))
               );
            }
         })
      );

      takeAll: T.Effect<unknown, never, readonly A[]> = T.suspend(() => {
         if (shutdownFlag.get) {
            return T.interrupt;
         } else {
            return T.total(() => {
               const as = unsafePollAll(queue);
               strategy.unsafeOnQueueEmptySpace(queue);
               return as;
            });
         }
      });

      takeUpTo: (n: number) => T.Effect<unknown, never, readonly A[]> = (max) =>
         T.suspend(() => {
            if (shutdownFlag.get) {
               return T.interrupt;
            } else {
               return T.total(() => {
                  const as = unsafePollN(queue, max);
                  strategy.unsafeOnQueueEmptySpace(queue);
                  return as;
               });
            }
         });
   })();

export const createQueue = <A>(strategy: Strategy<A>) => (queue: MutableQueue<A>) =>
   T.map_(XP.make<never, void>(), (p) => unsafeCreate(queue, new Unbounded(), p, new AtomicBoolean(false), strategy));

export const makeSliding = <A>(capacity: number): T.UIO<Queue<A>> =>
   T.chain_(
      T.total(() => new Bounded<A>(capacity)),
      createQueue(new SlidingStrategy())
   );

export const makeUnbounded = <A>(): T.UIO<Queue<A>> =>
   T.chain_(
      T.total(() => new Unbounded<A>()),
      createQueue(new DroppingStrategy())
   );

export const makeDropping = <A>(capacity: number): T.UIO<Queue<A>> =>
   T.chain_(
      T.total(() => new Bounded<A>(capacity)),
      createQueue(new DroppingStrategy())
   );

export const makeBounded = <A>(capacity: number): T.UIO<Queue<A>> =>
   T.chain_(
      T.total(() => new Bounded<A>(capacity)),
      createQueue(new BackPressureStrategy())
   );
