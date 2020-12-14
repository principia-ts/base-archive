import type { FreeBooleanAlgebra } from "@principia/core/FreeBooleanAlgebra";

import type { AssertionM } from "./AssertionM";

export interface AssertionValue<A> {
  readonly _tag: "AssertionValue";
  readonly value: A;
  readonly assertion: () => AssertionM<A>;
  readonly result: () => FreeBooleanAlgebra<AssertionValue<A>>;
}

export function AssertionValue<A>(
  assertion: () => AssertionM<A>,
  value: A,
  result: () => FreeBooleanAlgebra<AssertionValue<A>>
): AssertionValue<A> {
  return {
    _tag: "AssertionValue",
    assertion,
    value,
    result
  };
}

export function sameAssertion_<A>(self: AssertionValue<A>, that: AssertionValue<A>) {
  return self.assertion.toString() === that.assertion.toString();
}
