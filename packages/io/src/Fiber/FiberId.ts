import type { Eq } from "@principia/base/data/Eq";

import { makeEq } from "@principia/base/data/Eq";
import { AtomicNumber } from "@principia/base/util/support/AtomicNumber";

/*
 * -------------------------------------------
 * FiberId
 * -------------------------------------------
 */

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

export const emptyFiberId = FiberId(0, 0);

export const eqFiberId: Eq<FiberId> = makeEq(
  (x, y) => x.seqNumber === y.seqNumber && x.startTime === y.startTime
);

export function newFiberId() {
  return FiberId(new Date().getTime(), _fiberCounter.getAndIncrement());
}

export function prettyPrintFiberId(_: FiberId): string {
  return `#${_.seqNumber} (started at: ${new Date(_.startTime).toISOString()})`;
}
