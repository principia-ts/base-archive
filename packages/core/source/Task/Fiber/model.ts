import type * as HKT from "@principia/prelude/HKT";

import type { Option } from "../../Option";
import type { Exit } from "../Exit/model";
import type { FiberRef } from "../FiberRef/model";
import type { Scope } from "../Scope";
import type { UIO } from "../Task/model";
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

export type Fiber<E, A> = RuntimeFiber<E, A> | SyntheticFiber<E, A>;

export interface CommonFiber<E, A> {
   await: UIO<Exit<E, A>>;
   //children: Sync<Iterable<Runtime<any, any>>>
   getRef: <K>(fiberRef: FiberRef<K>) => UIO<K>;
   inheritRefs: UIO<void>;
   interruptAs(fiberId: FiberId): UIO<Exit<E, A>>;
   poll: UIO<Option<Exit<E, A>>>;
}

export interface RuntimeFiber<E, A> extends CommonFiber<E, A> {
   _tag: "RuntimeFiber";
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
