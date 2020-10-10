import type { Option } from "@principia/core/Option";
import type * as HKT from "@principia/prelude/HKT";

import type { UIO } from "../Effect/Effect";
import type { Exit } from "../Exit/Exit";
import type { FiberRef } from "../FiberRef/FiberRef";
import type { Scope } from "../Scope";
import type { FiberId } from "./FiberId";
import type { FiberStatus } from "./status";

export const URI = "Fiber";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Fiber<E, A>;
   }
}

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

export type Fiber<E, A> = Runtime<E, A> | Synthetic<E, A>;

export interface CommonFiber<E, A> {
   await: UIO<Exit<E, A>>;
   //children: Sync<Iterable<Runtime<any, any>>>
   getRef: <K>(fiberRef: FiberRef<K>) => UIO<K>;
   inheritRefs: UIO<void>;
   interruptAs(fiberId: FiberId): UIO<Exit<E, A>>;
   poll: UIO<Option<Exit<E, A>>>;
}

export interface Runtime<E, A> extends CommonFiber<E, A> {
   _tag: "RuntimeFiber";
}

export interface Synthetic<E, A> extends CommonFiber<E, A> {
   _tag: "SyntheticFiber";
}

/**
 * ```haskell
 * makeSynthetic :: Synthetic e a -> Fiber e a
 * ```
 *
 * A type helper for building a Synthetic Fiber
 */
export const makeSynthetic = <E, A>(_: Synthetic<E, A>): Fiber<E, A> => _;
