import * as O from "../Option";
import type { Cause } from "../Task/Exit/Cause";
import { _A, _E, _I, _R, _U, TaskInstructionTag } from "../Task/Task/constants";
import type { Instruction, Task, URI } from "../Task/Task/model";
import { AtomicReference } from "../Utils/support/AtomicReference";
import type { Async } from "./model";

export const asyncTaskIntegration = new AtomicReference<O.Option<<R, E, A>(_: Async<R, E, A>) => Task<R, E, A>>>(
   O.none()
);

export class _FailInstruction<E> {
   readonly _tag = TaskInstructionTag.Fail;
   readonly _S1!: (_: unknown) => void;
   readonly _S2!: () => never;

   readonly [_U]!: URI;
   readonly [_R]!: (_: unknown) => void;
   readonly [_E]!: () => E;
   readonly [_A]!: () => never;

   constructor(readonly cause: Cause<E>) {}

   get [_I](): Instruction {
      return this as any;
   }
}

export const asyncIntegrationNotImplemented = new _FailInstruction({
   _tag: "Die",
   value: new Error("Async-Task integration not implemented or unsupported")
});
