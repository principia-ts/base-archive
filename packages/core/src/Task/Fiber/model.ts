import type * as HKT from "@principia/prelude/HKT";

import type { Option } from "../../Option";
import type { Exit } from "../Exit/model";
import type { FiberRef } from "../FiberRef/model";
import type { Scope } from "../Scope";
import type { IO } from "../Task/model";
import type { FiberId } from "./FiberId";
import type { FiberStatus } from "./status";

export const URI = "Fiber";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

/**
 * InterruptStatus tracks interruptability of the current stack region
 */
export class InterruptStatus {
   constructor(readonly isInterruptible: boolean) {}

   get isUninteruptible(): boolean {
      return !this.isInterruptible;
   }

   get toBoolean(): boolean {
      return this.isInterruptible;
   }
}

export const interruptible = new InterruptStatus(true);

export const uninterruptible = new InterruptStatus(false);

export const interruptStatus = (b: boolean) => (b ? interruptible : uninterruptible);

/**
 * A record containing information about a `Fiber`.
 */
export class FiberDescriptor {
   constructor(
      readonly id: FiberId,
      readonly status: FiberStatus,
      readonly interruptors: ReadonlySet<FiberId>,
      readonly interruptStatus: InterruptStatus,
      readonly scope: Scope<Exit<any, any>>
   ) {}
}

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking ZIO effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 */
export type Fiber<E, A> = RuntimeFiber<E, A> | SyntheticFiber<E, A>;

export interface CommonFiber<E, A> {
   /**
    * Awaits the fiber, which suspends the awaiting fiber until the result of the
    * fiber has been determined.
    */
   readonly await: IO<Exit<E, A>>;
   /**
    * Gets the value of the fiber ref for this fiber, or the initial value of
    * the fiber ref, if the fiber is not storing the ref.
    */
   readonly getRef: <K>(fiberRef: FiberRef<K>) => IO<K>;
   /**
    * Inherits values from all {@link FiberRef} instances into current fiber.
    * This will resume immediately.
    */
   readonly inheritRefs: IO<void>;
   /**
    * Interrupts the fiber as if interrupted from the specified fiber. If the
    * fiber has already exited, the returned effect will resume immediately.
    * Otherwise, the effect will resume when the fiber exits.
    */
   readonly interruptAs: (fiberId: FiberId) => IO<Exit<E, A>>;
   /**
    * Tentatively observes the fiber, but returns immediately if it is not already done.
    */
   readonly poll: IO<Option<Exit<E, A>>>;
}

export interface RuntimeFiber<E, A> extends CommonFiber<E, A> {
   _tag: "RuntimeFiber";
   /**
    * The identity of the fiber.
    */
   readonly id: FiberId;

   readonly scope: Scope<Exit<E, A>>;
   /**
    * The status of the fiber.
    */
   readonly status: IO<FiberStatus>;
}

export interface SyntheticFiber<E, A> extends CommonFiber<E, A> {
   _tag: "SyntheticFiber";
}

/**
 * ```haskell
 * makeSynthetic :: Synthetic e a -> Fiber e a
 * ```
 *
 * A type helper for building a Synthetic Fiber
 */
export const makeSynthetic = <E, A>(_: SyntheticFiber<E, A>): Fiber<E, A> => _;
