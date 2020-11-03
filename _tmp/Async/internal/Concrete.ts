import type { Option } from "../../Option";
import type { Exit } from "../../Task/Exit";
import type { Cause } from "../../Task/Exit/Cause";
import { Async } from "../model";
import type { AsyncDriver } from "../run";
import type { InterruptStatus } from "./InterruptStatus";

export enum AsyncInstructionTag {
   All = "All",
   Pure = "Pure",
   Total = "Total",
   Promise = "Promise",
   PartialSync = "PartialSync",
   Async = "Async",
   Suspend = "Suspend",
   Fail = "Fail",
   Chain = "Chain",
   Fold = "Fold",
   Read = "Read",
   Give = "Give",
   Fork = "Fork",
   Race = "Race",
   InterruptStatus = "InterruptStatus",
   CheckInterruptible = "CheckInterruptible",
   OnInterrupt = "OnInterrupt"
}

export class PureInstruction<A> extends Async<unknown, never, A> {
   readonly _asyncTag = AsyncInstructionTag.Pure;
   constructor(readonly a: A) {
      super();
   }
}

export class AllInstruction<R, E, A> extends Async<R, E, ReadonlyArray<A>> {
   readonly _asyncTag = AsyncInstructionTag.All;
   constructor(readonly tasks: ReadonlyArray<Async<R, E, A>>) {
      super();
   }
}

export class TotalInstruction<A> extends Async<unknown, never, A> {
   readonly _asyncTag = AsyncInstructionTag.Total;
   constructor(readonly thunk: () => A) {
      super();
   }
}

export class PartialSyncInstruction<E, A> extends Async<unknown, E, A> {
   readonly _asyncTag = AsyncInstructionTag.PartialSync;
   constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
      super();
   }
}

export class AsyncInstruction<R, E, A> extends Async<R, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Async;
   constructor(readonly register: (resolve: (_: Async<R, E, A>) => void) => Option<Async<R, E, A>>) {
      super();
   }
}

export class SuspendInstruction<R, E, A> extends Async<R, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Suspend;
   constructor(readonly factory: () => Async<R, E, A>) {
      super();
   }
}

export class FailInstruction<E> extends Async<unknown, E, never> {
   readonly _asyncTag = AsyncInstructionTag.Fail;
   constructor(readonly e: Cause<E>) {
      super();
   }
}

export class ChainInstruction<R, E, A, Q, D, B> extends Async<R & Q, E | D, B> {
   readonly _asyncTag = AsyncInstructionTag.Chain;
   constructor(readonly task: Async<R, E, A>, readonly f: (a: A) => Async<Q, D, B>) {
      super();
   }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends Async<R & R1 & R2, E1 | E2, B | C> {
   readonly _asyncTag = AsyncInstructionTag.Fold;
   constructor(
      readonly task: Async<R, E, A>,
      readonly f: (e: Cause<E>) => Async<R1, E1, B>,
      readonly g: (a: A) => Async<R2, E2, C>
   ) {
      super();
   }
}

export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends Async<
   R & R1 & R2 & R3,
   E2 | E3,
   A2 | A3
> {
   readonly _asyncTag = AsyncInstructionTag.Race;

   constructor(
      readonly left: Async<R, E, A>,
      readonly right: Async<R1, E1, A1>,
      readonly leftWins: (exit: Exit<E, A>, driver: AsyncDriver<E1, A1>) => Async<R2, E2, A2>,
      readonly rightWins: (exit: Exit<E1, A1>, driver: AsyncDriver<E, A>) => Async<R3, E3, A3>
   ) {
      super();
   }
}

export class OnInterruptInstruction<R, E, A, Q, D, B> extends Async<R & Q, E | D, A> {
   readonly _asyncTag = AsyncInstructionTag.OnInterrupt;
   constructor(readonly task: Async<R, E, A>, readonly f: () => Async<Q, D, B>) {
      super();
   }
}

export class ReadInstruction<R0, R, E, A> extends Async<R0 & R, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Read;
   constructor(readonly f: (r: R0) => Async<R, E, A>) {
      super();
   }
}

export class GiveInstruction<R, E, A> extends Async<unknown, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Give;
   constructor(readonly task: Async<R, E, A>, readonly r: R) {
      super();
   }
}

export class CheckInterruptibleInstruction<R, E, A> extends Async<R, E, A> {
   readonly _asyncTag = AsyncInstructionTag.CheckInterruptible;
   constructor(readonly f: (_: InterruptStatus) => Async<R, E, A>) {
      super();
   }
}

export class InterruptStatusInstruction<R, E, A> extends Async<R, E, A> {
   readonly _asyncTag = AsyncInstructionTag.InterruptStatus;

   constructor(readonly task: Async<R, E, A>, readonly flag: InterruptStatus) {
      super();
   }
}

export class ForkInstruction<R, E, A> extends Async<R, never, AsyncDriver<E, A>> {
   readonly _asyncTag = AsyncInstructionTag.Fork;

   constructor(readonly task: Async<R, E, A>) {
      super();
   }
}

export type Concrete =
   | PureInstruction<unknown>
   | FailInstruction<unknown>
   | ChainInstruction<unknown, unknown, unknown, unknown, unknown, unknown>
   | FoldInstruction<unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>
   | ReadInstruction<unknown, unknown, unknown, unknown>
   | GiveInstruction<unknown, unknown, unknown>
   | TotalInstruction<unknown>
   | PartialSyncInstruction<unknown, unknown>
   | AsyncInstruction<unknown, unknown, unknown>
   | OnInterruptInstruction<unknown, unknown, unknown, unknown, unknown, unknown>
   | SuspendInstruction<unknown, unknown, unknown>
   | AllInstruction<unknown, unknown, unknown>
   | CheckInterruptibleInstruction<unknown, unknown, unknown>
   | InterruptStatusInstruction<unknown, unknown, unknown>
   | ForkInstruction<unknown, unknown, unknown>
   | RaceInstruction<
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown,
        unknown
     >;

export const concrete = <R, E, A>(_: Async<R, E, A>): Concrete => _ as any;
