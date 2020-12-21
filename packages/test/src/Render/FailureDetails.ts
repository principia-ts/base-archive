import type { AssertionValue } from "../Assertion";
import type { FreeBooleanAlgebra } from "../FreeBooleanAlgebra";
import type { GenFailureDetails } from "../GenFailureDetails";
import type { NonEmptyArray } from "@principia/base/data/NonEmptyArray";
import type { Option } from "@principia/base/data/Option";

import { none } from "@principia/base/data/Option";

export type TestResult = FreeBooleanAlgebra<FailureDetails>;

export interface FailureDetails {
  readonly assertion: NonEmptyArray<AssertionValue<any>>;
  readonly gen: Option<GenFailureDetails>;
}

export function FailureDetails(
  assertion: NonEmptyArray<AssertionValue<any>>,
  gen: Option<GenFailureDetails> = none()
): FailureDetails {
  return {
    assertion,
    gen
  };
}
