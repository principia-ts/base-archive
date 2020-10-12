import type { Option } from "@principia/core/Option";
import type { V as Variance } from "@principia/prelude/HKT";

import type { Effect } from "..";
import type { Cause } from "../Cause";
import type { Exit } from "../Exit/Exit";
import type { Driver } from "../Fiber/Driver";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/Fiber";
import type { FiberId } from "../Fiber/FiberId";
import type { FiberRef } from "../FiberRef/FiberRef";
import type { Scope } from "../Scope";
import type { Supervisor } from "../Supervisor";
import type { XPure } from "../XPure/XPure";

/*
 * -------------------------------------------
 * Effect Model
 * -------------------------------------------
 */

export const _R = "_R";
export const _E = "_E";
export const _A = "_A";
export const _I = "_I";
export const _U = "_U";

export const URI = "Effect";

export type URI = typeof URI;

export interface Effect<R, E, A> {
   readonly [_U]: URI;
   readonly [_E]: () => E;
   readonly [_A]: () => A;
   readonly [_R]: (_: R) => void;

   readonly [_I]: Instruction;

   readonly _S1: (_: unknown) => void;
   readonly _S2: () => never;
}

export enum EffectInstructionTag {
   Pure = "Pure",
   Chain = "Chain",
   Partial = "Partial",
   Total = "Total",
   Async = "Async",
   Fold = "Fold",
   Fork = "Fork",
   Fail = "Fail",
   Yield = "Yield",
   Read = "Read",
   Give = "Give",
   Suspend = "Suspend",
   Race = "Race",
   InterruptStatus = "InterruptStatus",
   CheckInterrupt = "CheckInterrupt",
   CheckDescriptor = "CheckDescriptor",
   Supervise = "Supervise",
   SuspendPartial = "SuspendPartial",
   NewFiberRef = "NewFiberRef",
   ModifyFiberRef = "ModifyFiberRef",
   GetForkScope = "GetForkScope",
   OverrideForkScope = "OverrideForkScope"
}

export type Instruction =
   | ChainInstruction<any, any, any, any, any, any>
   | PureInstruction<any>
   | PartialInstruction<any, any>
   | TotalInstruction<any>
   | AsyncInstruction<any, any, any>
   | FoldInstruction<any, any, any, any, any, any, any, any, any>
   | ForkInstruction<any, any, any>
   | InterruptStatusInstruction<any, any, any>
   | CheckInterruptInstruction<any, any, any>
   | FailInstruction<any>
   | CheckDescriptorInstruction<any, any, any>
   | YieldInstruction
   | ReadInstruction<any, any, any, any>
   | GiveInstruction<any, any, any>
   | SuspendInstruction<any, any, any>
   | SuspendPartialInstruction<any, any, any, any>
   | NewFiberRefInstruction<any>
   | ModifyFiberRefInstruction<any, any>
   | RaceInstruction<any, any, any, any, any, any, any, any, any, any, any, any>
   | SuperviseInstruction<any, any, any>
   | GetForkScopeInstruction<any, any, any>
   | OverrideForkScopeInstruction<any, any, any>
   | XPure<unknown, never, any, any, any>;

export const makeInstruction = <X>(
   _: Omit<X, typeof _U | typeof _E | typeof _A | typeof _R | typeof _I | "_S1" | "_S2">
): X => {
   const getInstruction = () => ({
      ..._,
      get [_I]() {
         return getInstruction();
      }
   });
   return getInstruction() as any;
};

export type V = Variance<"E", "+"> & Variance<"R", "-">;

export type UIO<A> = Effect<unknown, never, A>;
export type RIO<R, A> = Effect<R, never, A>;
export type IO<E, A> = Effect<unknown, E, A>;

export type Canceler<R> = RIO<R, void>;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Effect<R, E, A>;
   }
}

/*
 * -------------------------------------------
 * Effect Instructions
 * -------------------------------------------
 */

export interface ChainInstruction<R, E, A, R1, E1, A1> extends Effect<R & R1, E | E1, A1> {
   readonly _tag: EffectInstructionTag.Chain;
   readonly ma: Effect<R, E, A>;
   readonly f: (a: A) => Effect<R1, E1, A1>;
}

export const ChainInstruction = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   f: (a: A) => Effect<R1, E1, A1>
): ChainInstruction<R, E, A, R1, E1, A1> => makeInstruction({ _tag: EffectInstructionTag.Chain, ma, f });

// export class ChainInstruction<R, R1, E, E1, A, A1> extends BaseInstruction<R & R1, E | E1, A1> {
//    readonly _tag = "Chain";
//    constructor(readonly ma: Effect<R, E, A>, readonly f: (a: A) => Effect<R1, E1, A1>) {
//       super();
//    }
// }

export interface PureInstruction<A> extends Effect<unknown, never, A> {
   readonly _tag: EffectInstructionTag.Pure;
   readonly value: A;
}

export const PureInstruction = <A>(value: A): PureInstruction<A> =>
   makeInstruction({ _tag: EffectInstructionTag.Pure, value });

// export class PureInstruction<A> extends BaseInstruction<unknown, never, A> {
//    readonly _tag = "Pure";
//    constructor(readonly value: A) {
//       super();
//    }
// }

export interface PartialInstruction<E, A> extends Effect<unknown, E, A> {
   readonly _tag: EffectInstructionTag.Partial;
   readonly thunk: () => A;
   readonly onThrow: (u: unknown) => E;
}

export const PartialInstruction = <E, A>(thunk: () => A, onThrow: (u: unknown) => E): PartialInstruction<E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Partial,
      thunk,
      onThrow
   });

// export class PartialInstruction<E, A> extends BaseInstruction<unknown, E, A> {
//    readonly _tag = "Partial";
//    constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
//       super();
//    }
// }

export interface TotalInstruction<A> extends Effect<unknown, never, A> {
   readonly _tag: EffectInstructionTag.Total;
   readonly thunk: () => A;
}

export const TotalInstruction = <A>(thunk: () => A): TotalInstruction<A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Total,
      thunk
   });

// export class TotalInstruction<A> extends BaseInstruction<unknown, never, A> {
//    readonly _tag = "Total";
//    constructor(readonly thunk: () => A) {
//       super();
//    }
// }

export interface AsyncInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.Async;
   readonly register: (f: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>;
   readonly blockingOn: ReadonlyArray<FiberId>;
}

export const AsyncInstruction = <R, E, A>(
   register: (f: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>,
   blockingOn: ReadonlyArray<FiberId>
): AsyncInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Async,
      register,
      blockingOn
   });

// export class AsyncInstruction<R, E, A> extends BaseInstruction<R, E, A> {
//    readonly _tag = "Async";
//    constructor(
//       readonly register: (f: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>,
//       readonly blockingOn: ReadonlyArray<FiberId>
//    ) {
//       super();
//    }
// }

export interface FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends Effect<R & R1 & R2, E1 | E2, B | C> {
   readonly _tag: EffectInstructionTag.Fold;
   readonly fa: Effect<R, E, A>;
   readonly onFailure: (cause: Cause<E>) => Effect<R1, E1, B>;
   readonly onSuccess: (a: A) => Effect<R2, E2, C>;
   readonly apply: (v: A) => Effect<R & R1 & R2, E1 | E2, B | C>;
}

export const FoldInstruction = <R, E, A, R1, E1, B, R2, E2, C>(
   fa: Effect<R, E, A>,
   onFailure: (cause: Cause<E>) => Effect<R1, E1, B>,
   onSuccess: (a: A) => Effect<R2, E2, C>
): FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> =>
   makeInstruction({
      _tag: EffectInstructionTag.Fold,
      fa,
      onFailure,
      onSuccess,
      apply(v) {
         return onSuccess(v);
      }
   });

// export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends BaseInstruction<R & R1 & R2, E1 | E2, B | C> {
//    readonly _tag = "Fold";

//    constructor(
//       readonly fa: Effect<R, E, A>,
//       readonly onFailure: (cause: Cause<E>) => Effect<R1, E1, B>,
//       readonly onSuccess: (a: A) => Effect<R2, E2, C>
//    ) {
//       super();
//    }

//    apply(v: A): Effect<R & R1 & R2, E1 | E2, B | C> {
//       return this.onSuccess(v);
//    }
// }

export interface ForkInstruction<R, E, A> extends Effect<R, never, Driver<E, A>> {
   readonly _tag: EffectInstructionTag.Fork;
   readonly fa: Effect<R, E, A>;
   readonly scope: Option<Scope<Exit<any, any>>>;
}

export const ForkInstruction = <R, E, A>(
   fa: Effect<R, E, A>,
   scope: Option<Scope<Exit<any, any>>>
): ForkInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Fork,
      fa,
      scope
   });

// export class ForkInstruction<R, E, A> extends BaseInstruction<R, never, FiberContext<E, A>> {
//    readonly _tag = "Fork";

//    constructor(readonly E: Effect<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
//       super();
//    }
// }

export interface FailInstruction<E> extends Effect<unknown, E, never> {
   readonly _tag: EffectInstructionTag.Fail;
   readonly cause: Cause<E>;
}

export const FailInstruction = <E>(cause: Cause<E>): FailInstruction<E> =>
   makeInstruction({
      _tag: EffectInstructionTag.Fail,
      cause
   });

// export class FailInstruction<E> extends BaseInstruction<unknown, E, never> {
//    readonly _tag = "Fail";

//    constructor(readonly C: Cause<E>) {
//       super();
//    }
// }

export interface YieldInstruction extends Effect<unknown, never, void> {
   readonly _tag: EffectInstructionTag.Yield;
}

export const YieldInstruction = (): YieldInstruction =>
   makeInstruction({
      _tag: EffectInstructionTag.Yield
   });

// export class YieldInstruction extends BaseInstruction<unknown, never, void> {
//    readonly _tag = "Yield";

//    constructor() {
//       super();
//    }
// }

export interface ReadInstruction<R0, R, E, A> extends Effect<R & R0, E, A> {
   readonly _tag: EffectInstructionTag.Read;
   readonly f: (_: R0) => Effect<R, E, A>;
}

export const ReadInstruction = <R0, R, E, A>(f: (_: R0) => Effect<R, E, A>): ReadInstruction<R0, R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Read,
      f
   });

// export class ReadInstruction<R0, R, E, A> extends BaseInstruction<R & R0, E, A> {
//    readonly _tag = "Read";

//    constructor(readonly f: (_: R0) => Effect<R, E, A>) {
//       super();
//    }
// }

export interface GiveInstruction<R, E, A> extends Effect<unknown, E, A> {
   readonly _tag: EffectInstructionTag.Give;
   readonly fa: Effect<R, E, A>;
   readonly env: R;
}

export const GiveInstruction = <R, E, A>(fa: Effect<R, E, A>, env: R): GiveInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Give,
      fa,
      env
   });

// export class ProvideInstruction<R, E, A> extends BaseInstruction<unknown, E, A> {
//    readonly _tag = "Provide";

//    constructor(readonly fa: Effect<R, E, A>, readonly env: R) {
//       super();
//    }
// }

export interface SuspendInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.Suspend;
   readonly factory: () => Effect<R, E, A>;
}

export const SuspendInstruction = <R, E, A>(factory: () => Effect<R, E, A>): SuspendInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Suspend,
      factory
   });

// export class SuspendInstruction<R, E, A> extends BaseInstruction<R, E, A> {
//    readonly _tag = "Suspend";

//    constructor(readonly factory: () => Effect<R, E, A>) {
//       super();
//    }
// }

export interface RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
   extends Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
   readonly _tag: EffectInstructionTag.Race;
   readonly left: Effect<R, E, A>;
   readonly right: Effect<R1, E1, A1>;
   readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>;
   readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>;
   readonly scope: Option<Scope<Exit<any, any>>>;
}

export const RaceInstruction = <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
   left: Effect<R, E, A>,
   right: Effect<R1, E1, A1>,
   leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
   rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
   scope: Option<Scope<Exit<any, any>>>
): RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> =>
   makeInstruction({
      _tag: EffectInstructionTag.Race,
      left,
      right,
      leftWins,
      rightWins,
      scope
   });

// export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends BaseInstruction<
//    R & R1 & R2 & R3,
//    E2 | E3,
//    A2 | A3
// > {
//    readonly _tag = "Race";

//    constructor(
//       readonly left: Effect<R, E, A>,
//       readonly right: Effect<R1, E1, A1>,
//       readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
//       readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
//       readonly scope: Option<Scope<Exit<any, any>>>
//    ) {
//       super();
//    }
// }

export interface InterruptStatusInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.InterruptStatus;
   readonly fa: Effect<R, E, A>;
   readonly flag: InterruptStatus;
}

export const InterruptStatusInstruction = <R, E, A>(
   fa: Effect<R, E, A>,
   flag: InterruptStatus
): InterruptStatusInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.InterruptStatus,
      fa,
      flag
   });

// export class ChangeInterruptStatusInstruction<R, E, A> extends BaseInstruction<R, E, A> {
//    readonly _tag = "ChangeInterruptStatus";

//    constructor(readonly E: Effect<R, E, A>, readonly flag: InterruptStatus) {
//       super();
//    }
// }

export interface CheckInterruptInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.CheckInterrupt;
   readonly f: (_: InterruptStatus) => Effect<R, E, A>;
}

export const CheckInterruptInstruction = <R, E, A>(
   f: (_: InterruptStatus) => Effect<R, E, A>
): CheckInterruptInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.CheckInterrupt,
      f
   });

// export class CheckInterruptInstruction<R, E, A> extends BaseInstruction<R, E, A> {
//    readonly _tag = "CheckInterrupt";

//    constructor(readonly f: (_: InterruptStatus) => Effect<R, E, A>) {
//       super();
//    }
// }

export interface CheckDescriptorInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.CheckDescriptor;
   readonly f: (_: FiberDescriptor) => Effect<R, E, A>;
}

export const CheckDescriptorInstruction = <R, E, A>(
   f: (_: FiberDescriptor) => Effect<R, E, A>
): CheckDescriptorInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.CheckDescriptor,
      f
   });

// export class CheckDescriptorInstruction<R, E, A> extends BaseInstruction<R, E, A> {
//    readonly _tag = "CheckDescriptor";

//    constructor(readonly f: (_: FiberDescriptor) => Effect<R, E, A>) {
//       super();
//    }
// }

export interface SuperviseInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.Supervise;
   readonly fa: Effect<R, E, A>;
   readonly supervisor: Supervisor<any>;
}

export const SuperviseInstruction = <R, E, A>(
   fa: Effect<R, E, A>,
   supervisor: Supervisor<any>
): SuperviseInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.Supervise,
      fa,
      supervisor
   });

// export class SuperviseInstruction<R, E, A> extends BaseInstruction<R, E, A> {
//    readonly _tag = "Supervise";

//    constructor(readonly E: Effect<R, E, A>, readonly supervisor: Supervisor<any>) {
//       super();
//    }
// }

export interface SuspendPartialInstruction<R, E, A, E1> extends Effect<R, E | E1, A> {
   readonly _tag: EffectInstructionTag.SuspendPartial;
   readonly factory: () => Effect<R, E, A>;
   readonly onThrow: (u: unknown) => E1;
}

export const SuspendPartialInstruction = <R, E, A, E1>(
   factory: () => Effect<R, E, A>,
   onThrow: (u: unknown) => E1
): SuspendPartialInstruction<R, E, A, E1> =>
   makeInstruction({
      _tag: EffectInstructionTag.SuspendPartial,
      factory,
      onThrow
   });

/*
 * export class SuspendPartialInstruction<R, E, A, E2> extends BaseInstruction<R, E | E2, A> {
 *    readonly _tag = "SuspendPartial";
 *
 *    constructor(readonly factory: () => Effect<R, E, A>, readonly onThrow: (u: unknown) => E2) {
 *       super();
 *    }
 * }
 */

export interface NewFiberRefInstruction<A> extends Effect<unknown, never, FiberRef<A>> {
   readonly _tag: EffectInstructionTag.NewFiberRef;
   readonly initial: A;
   readonly onFork: (a: A) => A;
   readonly onJoin: (a: A, a2: A) => A;
}

export const NewFiberRefInstruction = <A>(
   initial: A,
   onFork: (a: A) => A,
   onJoin: (a: A, a2: A) => A
): NewFiberRefInstruction<A> =>
   makeInstruction({
      _tag: EffectInstructionTag.NewFiberRef,
      initial,
      onFork,
      onJoin
   });

/*
 * export class NewFiberRefInstruction<A> extends BaseInstruction<unknown, never, FiberRef<A>> {
 *    readonly _tag = "NewFiberRef";
 *
 *    constructor(readonly initial: A, readonly onFork: (a: A) => A, readonly onJoin: (a: A, a2: A) => A) {
 *       super();
 *    }
 * }
 */

export interface ModifyFiberRefInstruction<A, B> extends Effect<unknown, never, B> {
   readonly _tag: EffectInstructionTag.ModifyFiberRef;
   readonly fiberRef: FiberRef<A>;
   readonly f: (a: A) => readonly [B, A];
}

export const ModifyFiberRefInstruction = <A, B>(
   fiberRef: FiberRef<A>,
   f: (a: A) => readonly [B, A]
): ModifyFiberRefInstruction<A, B> =>
   makeInstruction({
      _tag: EffectInstructionTag.ModifyFiberRef,
      fiberRef,
      f
   });

/*
 * export class ModifyFiberRefInstruction<A, B> extends BaseInstruction<unknown, never, B> {
 *    readonly _tag = "ModifyFiberRef";
 *
 *    constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
 *       super();
 *    }
 * }
 */

export interface GetForkScopeInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.GetForkScope;
   readonly f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>;
}

export const GetForkScopeInstruction = <R, E, A>(
   f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>
): GetForkScopeInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.GetForkScope,
      f
   });

/*
 * export class GetForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
 *    readonly _tag = "GetForkScope";
 *
 *    constructor(readonly f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>) {
 *       super();
 *    }
 * }
 */

export interface OverrideForkScopeInstruction<R, E, A> extends Effect<R, E, A> {
   readonly _tag: EffectInstructionTag.OverrideForkScope;
   readonly fa: Effect<R, E, A>;
   readonly forkScope: Option<Scope<Exit<any, any>>>;
}

export const OverrideForkScopeInstruction = <R, E, A>(
   fa: Effect<R, E, A>,
   forkScope: Option<Scope<Exit<any, any>>>
): OverrideForkScopeInstruction<R, E, A> =>
   makeInstruction({
      _tag: EffectInstructionTag.OverrideForkScope,
      fa,
      forkScope
   });

/*
 * export class OverrideForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
 *    readonly _tag = "OverrideForkScope";
 *
 *    constructor(readonly E: Effect<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
 *       super();
 *    }
 * }
 */
