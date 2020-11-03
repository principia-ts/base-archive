import type { Option } from "../Option";
import * as O from "../Option";
import { AtomicReference } from "../support";
import type { Cause } from "../Task/Exit/Cause";
import { TaskInstructionTag } from "../Task/Task/constants";
import type * as T from "../Task/Task/model";

export const taskIntegrationRef = new AtomicReference<Option<<R, E, A>(task: Async<R, E, A>) => T.Task<R, E, A>>>(
   O.none()
);

export class _FailInstruction<E> {
   readonly _tag = TaskInstructionTag.Fail;
   readonly _S1!: (_: unknown) => void;
   readonly _S2!: () => never;

   readonly ["_U"]!: T.URI;
   readonly ["_E"]!: () => E;
   readonly ["_A"]!: () => never;
   readonly ["_R"]!: (_: unknown) => void;

   constructor(readonly cause: Cause<E>) {}

   get ["_I"](): T.Instruction {
      return this as any;
   }
}

export const integrationNotImplemented = new _FailInstruction({
   _tag: "Die",
   value: new Error("not supported")
});

export class Async<R, E, A> implements T.Integration<R, E, A> {
   readonly _tag = "Integration";
   readonly _S1!: (_: unknown) => void;
   readonly _S2!: () => never;

   readonly ["_U"]!: T.URI;
   readonly ["_E"]!: () => E;
   readonly ["_A"]!: () => A;
   readonly ["_R"]!: (_: R) => void;

   get ["_I"](): T.Instruction {
      const ci = taskIntegrationRef.get;
      if (ci._tag === "Some") {
         return ci.value(this)["_I"];
      }
      return integrationNotImplemented;
   }
}
