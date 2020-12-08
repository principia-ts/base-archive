import type { Option } from "../../Option";
import type { FiberId } from "./FiberId";
import type { FiberStatus } from "./status";

export interface FiberDump {
  _tag: "FiberDump";
  fiberId: FiberId;
  fiberName: Option<string>;
  status: FiberStatus;
}

export const FiberDump = (
  fiberId: FiberId,
  fiberName: Option<string>,
  status: FiberStatus
): FiberDump => ({
  _tag: "FiberDump",
  fiberId,
  fiberName,
  status
});
