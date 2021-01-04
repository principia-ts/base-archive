import type { Assertion, AssertionM, AssertResult } from './Assertion'
import type { ExecutedSpec } from './ExecutedSpec'
import type { TestResult } from './Render'
import type { TestLogger } from './TestLogger'
import type { WidenLiteral } from './util'
import type { Has } from '@principia/base/data/Has'
import type { Show } from '@principia/base/data/Show'
import type { UnionToIntersection } from '@principia/base/util/types'
import type { IO, URIO } from '@principia/io/IO'

import { flow } from '@principia/base/data/Function'
import * as NA from '@principia/base/data/NonEmptyArray'
import * as O from '@principia/base/data/Option'
import { none } from '@principia/base/data/Option'
import * as I from '@principia/io/IO'
import * as M from '@principia/io/Managed'

import { TestAnnotationMap } from './Annotation'
import { AssertionValue } from './Assertion'
import * as BA from './FreeBooleanAlgebra'
import { FailureDetails } from './Render'
import * as Spec from './Spec'
import * as TF from './TestFailure'
import * as TS from './TestSuccess'

export type TestReporter<E> = (duration: number, spec: ExecutedSpec<E>) => URIO<Has<TestLogger>, void>

function traverseResultLoop<A>(whole: AssertionValue<A>, failureDetails: FailureDetails): TestResult {
  if (whole.isSameAssertionAs(NA.head(failureDetails.assertion))) {
    return BA.success(failureDetails)
  } else {
    const fragment = whole.result()
    const result   = BA.isTrue(fragment) ? fragment : BA.not(fragment)
    return BA.chain_(result, (fragment) =>
      traverseResultLoop(fragment, FailureDetails([whole, ...failureDetails.assertion], failureDetails.gen))
    )
  }
}

export function traverseResult<A>(
  value: A,
  assertResult: () => AssertResult<A>,
  assertion: () => AssertionM<A>,
  showA?: Show<A>
): TestResult {
  return BA.chain_(assertResult(), (fragment) =>
    traverseResultLoop(fragment, FailureDetails([new AssertionValue(value, assertion, assertResult, showA)]))
  )
}

export function assert<A>(
  value: WidenLiteral<A>,
  assertion: Assertion<WidenLiteral<A>>,
  showA?: Show<WidenLiteral<A>>
): TestResult {
  return traverseResult(
    value,
    () => assertion.run(value),
    () => assertion,
    showA
  )
}

export function assertM<R, E, A>(io: IO<R, E, A>, assertion: AssertionM<A>, showA?: Show<A>): IO<R, E, TestResult> {
  return I.gen(function* (_) {
    const value        = yield* _(io)
    const assertResult = yield* _(assertion.runM(value))
    return traverseResult(
      value,
      () => assertResult,
      () => assertion,
      showA
    )
  })
}

type MergeR<Specs extends ReadonlyArray<Spec.XSpec<any, any>>> = UnionToIntersection<
  {
    [K in keyof Specs]: [Specs[K]] extends [Spec.XSpec<infer R, any>] ? (unknown extends R ? never : R) : never
  }[number]
>

type MergeE<Specs extends ReadonlyArray<Spec.XSpec<any, any>>> = {
  [K in keyof Specs]: [Specs[K]] extends [Spec.XSpec<any, infer E>] ? E : never
}[number]

export function suite(
  label: string
): <Specs extends ReadonlyArray<Spec.XSpec<any, any>>>(...specs: Specs) => Spec.XSpec<MergeR<Specs>, MergeE<Specs>> {
  return (...specs) => Spec.suite(label, M.succeed(specs), none())
}

export function testM<R, E>(label: string, assertion: () => IO<R, E, TestResult>): Spec.XSpec<R, E> {
  return Spec.test(
    label,
    I.foldCauseM_(
      I.suspend(assertion),
      flow(TF.halt, I.fail),
      flow(
        BA.failures,
        O.fold(
          () => I.succeed(new TS.Succeeded(BA.success(undefined))),
          (failures) => I.fail(TF.assertion(failures))
        )
      )
    ),
    TestAnnotationMap.empty
  )
}

export function test(label: string, assertion: () => TestResult): Spec.XSpec<unknown, never> {
  return testM(label, () => I.total(assertion))
}
