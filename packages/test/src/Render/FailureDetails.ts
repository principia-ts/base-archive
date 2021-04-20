import type { AssertionValue } from '../Assertion'
import type { FreeBooleanAlgebra } from '../FreeBooleanAlgebra'
import type { GenFailureDetails } from '../GenFailureDetails'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'

import { None } from '@principia/base/Option'

export type TestResult = FreeBooleanAlgebra<FailureDetails>

export interface FailureDetails {
  readonly assertion: NonEmptyArray<AssertionValue<any>>
  readonly gen: Option<GenFailureDetails>
}

export function FailureDetails(
  assertion: NonEmptyArray<AssertionValue<any>>,
  gen: Option<GenFailureDetails> = None()
): FailureDetails {
  return {
    assertion,
    gen
  }
}
