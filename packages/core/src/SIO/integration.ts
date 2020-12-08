import type { Cause } from "../IO/Cause";
import { _A, _E, _I, _R, _U, IOInstructionTag } from "../IO/constants";
import type { Trace } from "../IO/Fiber/tracing";
import type { Instruction, IO, URI } from "../IO/model";
import * as O from "../Option";
import { AtomicReference } from "../Utils/support/AtomicReference";
import type { SIO } from "./model";

export const SIOtoIO = new AtomicReference<
  O.Option<<R, E, A>(_: SIO<unknown, never, R, E, A>) => IO<R, E, A>>
>(O.none());

export class _FailInstruction<E> {
  readonly _tag = IOInstructionTag.Fail;
  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  readonly [_U]!: URI;
  readonly [_R]!: (_: unknown) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => never;

  constructor(readonly fill: (_: () => Trace) => Cause<E>) {}

  get [_I](): Instruction {
    return this as any;
  }
}

export const SIOIntegrationNotImplemented = new _FailInstruction(() => ({
  _tag: "Die",
  value: new Error("SIO-IO integration not implemented or unsupported")
}));
