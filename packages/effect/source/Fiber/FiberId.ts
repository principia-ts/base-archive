import type { Eq } from "@principia/core/Eq";

import { AtomicNumber } from "../Support/AtomicNumber";

export interface FiberId {
   readonly _tag: "FiberID";
   /** Start time in milliseconds */
   readonly startTime: number;
   readonly seqNumber: number;
}

const _fiberCounter = new AtomicNumber(0);

export const fiberId = (args?: Omit<FiberId, "_tag">): FiberId => ({
   _tag: "FiberID",
   startTime: args?.startTime ?? new Date().getTime(),
   seqNumber: args?.seqNumber ?? _fiberCounter.getAndIncrement()
});

export const none = fiberId({ startTime: 0, seqNumber: 0 });

export const eqFiberId: Eq<FiberId> = {
   equals: (x) => (y) => x.seqNumber === y.seqNumber && x.startTime === y.startTime
};
