import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { AtomicNumber } from "../../Utils/support/AtomicNumber";

export interface FiberId {
   readonly _tag: "FiberId";
   /** Start time in milliseconds */
   readonly startTime: number;
   readonly seqNumber: number;
}

const _fiberCounter = new AtomicNumber(0);

export const FiberId = (startTime: number, seqNumber: number): FiberId => ({
   _tag: "FiberId",
   startTime,
   seqNumber
});

export const none = FiberId(0, 0);

export const eqFiberId: Eq<FiberId> = fromEquals((x, y) => x.seqNumber === y.seqNumber && x.startTime === y.startTime);

export function newFiberId() {
   return FiberId(new Date().getTime(), _fiberCounter.getAndIncrement());
}
