export const _AI = "_AI";
export type _AI = typeof _AI;
export enum AsyncInstructionTag {
  Succeed = "Succeed",
  Total = "Total",
  Partial = "Partial",
  Suspend = "Suspend",
  Promise = "Promise",
  Chain = "Chain",
  Fold = "Fold",
  Asks = "Asks",
  Done = "Done",
  Give = "Give",
  Finalize = "Finalize",
  All = "All",
  Fail = "Fail",
  Interrupt = "Interrupt"
}
