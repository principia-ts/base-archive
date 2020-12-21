import type { Cause } from "../Cause";
import type { Trace } from "../Trace";
import type { Instruction } from "./core";

export const _R = "_R";
export const _E = "_E";
export const _A = "_A";
export const _I = "_I";
export const _U = "_U";

export enum IOInstructionTag {
  Succeed = "Succeed",
  FlatMap = "FlatMap",
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
  SetInterrupt = "SetInterrupt",
  GetInterrupt = "GetInterrupt",
  CheckDescriptor = "CheckDescriptor",
  Supervise = "Supervise",
  SuspendPartial = "SuspendPartial",
  NewFiberRef = "NewFiberRef",
  ModifyFiberRef = "ModifyFiberRef",
  GetForkScope = "GetForkScope",
  OverrideForkScope = "OverrideForkScope",
  Integration = "Integration",
  Trace = "Trace",
  SetTracingStatus = "SetTracingStatus",
  GetTracingStatus = "GetTracingStatus"
}

export class ExternalFailInstruction<E> {
  readonly _tag = IOInstructionTag.Fail;
  readonly [_U]: "IO";
  readonly [_E]: () => E;
  readonly [_A]: () => never;
  readonly [_R]: (_: unknown) => void;

  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  get [_I](): Instruction {
    return this as any;
  }

  constructor(readonly fill: (_: () => Trace) => Cause<E>) {}
}
