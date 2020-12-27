import type { Cause } from "./Cause";

export class Platform {
  constructor(public reportFailure: (e: Cause<unknown>) => void, public maxOp: number) {}
}
