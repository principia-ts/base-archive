import type { FreeMonoid } from "@principia/core/FreeMonoid";
import type { NonEmptyArray } from "@principia/core/NonEmptyArray";
import type { Option } from "@principia/core/Option";
import { none } from "@principia/core/Option";

import type { AssertionValue } from "./AssertionValue";
import type { GenFailureDetails } from "./GenFailureDetails";

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
