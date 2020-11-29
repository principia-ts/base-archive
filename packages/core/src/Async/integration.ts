import { _A, _E, _I, _R, _U, AIOInstructionTag } from "../AIO/AIO/constants";
import type { AIO, Instruction, URI } from "../AIO/AIO/model";
import type { Cause } from "../AIO/Exit/Cause";
import * as O from "../Option";
import { AtomicReference } from "../Utils/support/AtomicReference";
import type { Async } from "./model";

export const AsynctoAIO = new AtomicReference<
  O.Option<<R, E, A>(_: Async<R, E, A>) => AIO<R, E, A>>
>(O.none());

export class _FailInstruction<E> {
  readonly _tag = AIOInstructionTag.Fail;
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
  value: new Error("Async-AIO integration not implemented or unsupported")
});
