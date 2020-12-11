import type { FreeMonoid } from "@principia/core/FreeMonoid";
import type { Option } from "@principia/core/Option";
import { none } from "@principia/core/Option";

import type { AssertionValue } from "./AssertionValue";
import type { GenFailureDetails } from "./GenFailureDetails";

export interface FailureDetails {
  readonly assertion: FreeMonoid<AssertionValue>;
  readonly gen: Option<GenFailureDetails>;
}

export function FailureDetails(
  assertion: FreeMonoid<AssertionValue>,
  gen: Option<GenFailureDetails> = none()
): FailureDetails {
  return {
    assertion,
    gen
  };
}
