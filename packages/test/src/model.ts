import type { FreeBooleanAlgebra, FreeBooleanAlgebraM } from "@principia/core/FreeBooleanAlgebra";

import type { AssertionValue } from "./AssertionValue";
import type { FailureDetails } from "./FailureDetails";

export interface Callsite {
  readonly column: number;
  readonly line: number;
}

export type AssertResult<A> = FreeBooleanAlgebra<AssertionValue<A>>;
export type AssertResultM<A> = FreeBooleanAlgebraM<unknown, never, AssertionValue<A>>;

export type TestResult = FreeBooleanAlgebra<FailureDetails>;
