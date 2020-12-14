import type { FreeBooleanAlgebra, FreeBooleanAlgebraM } from "@principia/core/FreeBooleanAlgebra";
import * as BA from "@principia/core/FreeBooleanAlgebra";
import * as FM from "@principia/core/FreeMonoid";
import type { Has } from "@principia/core/Has";
import type { IO, URIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import * as M from "@principia/core/Managed";
import * as NA from "@principia/core/NonEmptyArray";
import * as O from "@principia/core/Option";
import { none } from "@principia/core/Option";
import * as Sy from "@principia/core/Sync";
import type { UnionToIntersection } from "@principia/core/Utils";
import { flow, pipe } from "@principia/prelude";

import type { Assertion } from "./Assertion";
import type { AssertionM } from "./AssertionM";
import { AssertionValue, sameAssertion_ } from "./AssertionValue";
import type { ExecutedSpec } from "./ExecutedSpec";
import { FailureDetails } from "./FailureDetails";
import type { AbstractSpec } from "./Spec";
import * as S from "./Spec";
import type { TestFailure } from "./TestFailure";
import * as TF from "./TestFailure";
import type { TestLogger } from "./TestLogger";
import type { TestSuccess } from "./TestSuccess";
import * as TS from "./TestSuccess";

export type AssertResult<A> = FreeBooleanAlgebra<AssertionValue<A>>;
export type AssertResultM<A> = FreeBooleanAlgebraM<unknown, never, AssertionValue<A>>;

export type TestResult = FreeBooleanAlgebra<FailureDetails>;

export type Spec<R, E> = AbstractSpec<R, TestFailure<E>, TestSuccess>;

export type TestReporter<E> = (
  duration: number,
  spec: ExecutedSpec<E>
) => URIO<Has<TestLogger>, void>;

function traverseResultLoop<A>(
  whole: AssertionValue<A>,
  failureDetails: FailureDetails
): TestResult {
  if (sameAssertion_(whole, NA.head(failureDetails.assertion))) {
    return BA.success(failureDetails);
  } else {
    const fragment = whole.result();
    const result = BA.isTrue(fragment) ? fragment : BA.not(fragment);
    return BA.chain_(result, (fragment) =>
      traverseResultLoop(
        fragment,
        FailureDetails([whole, ...failureDetails.assertion], failureDetails.gen)
      )
    );
  }
}

export function traverseResult<A>(
  value: A,
  assertResult: () => AssertResult<A>,
  assertion: () => AssertionM<A>
): TestResult {
  return BA.chain_(assertResult(), (fragment) =>
    traverseResultLoop(fragment, FailureDetails([AssertionValue(assertion, value, assertResult)]))
  );
}

export function assert<A>(value: A, assertion: Assertion<A>): TestResult {
  return traverseResult(
    value,
    () => assertion.run(value),
    () => assertion
  );
}

export function assertM<R, E, A>(io: IO<R, E, A>, assertion: AssertionM<A>): IO<R, E, TestResult> {
  return I.gen(function* (_) {
    const value = yield* _(io);
    const assertResult = yield* _(assertion.runM(value));
    return traverseResult(
      value,
      () => assertResult,
      () => assertion
    );
  });
}

type MergeR<Specs extends ReadonlyArray<AbstractSpec<any, any, any>>> = UnionToIntersection<
  {
    [K in keyof Specs]: [Specs[K]] extends [AbstractSpec<infer R, any, any>]
      ? unknown extends R
        ? never
        : R
      : never;
  }[number]
>;

type MergeE<Specs extends ReadonlyArray<AbstractSpec<any, any, any>>> = {
  [K in keyof Specs]: [Specs[K]] extends [AbstractSpec<any, infer E, any>] ? E : never;
}[number];

type MergeT<Specs extends ReadonlyArray<AbstractSpec<any, any, any>>> = {
  [K in keyof Specs]: [Specs[K]] extends [AbstractSpec<any, any, infer T>] ? T : never;
}[number];

export function suite(
  label: string
): <Specs extends ReadonlyArray<AbstractSpec<any, any, any>>>(
  ...specs: Specs
) => AbstractSpec<MergeR<Specs>, MergeE<Specs>, MergeT<Specs>> {
  return (...specs) => S.suite(label, M.succeed(specs), none());
}

export function testM<R, E>(label: string, assertion: () => IO<R, E, TestResult>): Spec<R, E> {
  return S.test(
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
    )
  );
}

export function test(label: string, assertion: () => TestResult): Spec<unknown, never> {
  return testM(label, () => I.total(assertion));
}
