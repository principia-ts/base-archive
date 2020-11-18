export const _R = "_R";
export const _E = "_E";
export const _A = "_A";
export const _I = "_I";
export const _U = "_U";

export enum TaskInstructionTag {
  Succeed = "Succeed",
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
  SetInterrupt = "SetInterrupt",
  GetInterrupt = "GetInterrupt",
  CheckDescriptor = "CheckDescriptor",
  Supervise = "Supervise",
  SuspendPartial = "SuspendPartial",
  NewFiberRef = "NewFiberRef",
  ModifyFiberRef = "ModifyFiberRef",
  GetForkScope = "GetForkScope",
  OverrideForkScope = "OverrideForkScope",
  Integration = "Integration"
}
