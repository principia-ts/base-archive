import type { AssertionM } from "./AssertionM";
import type { AssertResult } from "./model";

export interface AssertionValue<A> {
  readonly _tag: "AssertionValue";
  readonly value: A;
  readonly assertion: () => AssertionM<A>;
  readonly result: () => AssertResult<A>;
}

export function AssertionValue<A>(
  assertion: () => AssertionM<A>,
  value: A,
  result: () => AssertResult<A>
): AssertionValue<A> {
  return {
    _tag: "AssertionValue",
    assertion,
    value,
    result
  };
}
