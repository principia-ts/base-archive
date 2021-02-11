import type { TestAnnotation } from './Annotation'
import type { TestFailure } from './TestFailure'
import type { TestSuccess } from './TestSuccess'
import type { Predicate } from '@principia/base/Function'
import type { Has } from '@principia/base/Has'
import type { Clock } from '@principia/io/Clock'
import type { ExecutionStrategy } from '@principia/io/ExecutionStrategy'
import type { IO } from '@principia/io/IO'
import type { Schedule } from '@principia/io/Schedule'

import * as Eq from '@principia/base/Eq'
import { constTrue, pipe } from '@principia/base/Function'
import { hashString } from '@principia/base/Hash'
import * as Set from '@principia/base/HashSet'
import * as O from '@principia/base/Option'
import { matchTag, matchTag_ } from '@principia/base/util/matchers'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as M from '@principia/io/Managed'
import * as Sc from '@principia/io/Schedule'

import { Annotations } from './Annotation'
import * as Annotation from './Annotation'
import * as S from './Spec'
import { TestConfig } from './TestConfig'
import * as TF from './TestFailure'
import { RuntimeFailure } from './TestFailure'

export class TestAspect<R, E> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E

  constructor(
    readonly some: <R1, E1>(predicate: (label: string) => boolean, spec: S.XSpec<R1, E1>) => S.XSpec<R & R1, E | E1>
  ) {}

  all<R1, E1>(spec: S.XSpec<R1, E1>): S.XSpec<R & R1, E | E1> {
    return this.some(constTrue, spec)
  }

  ['>>>']<R1 extends R, E1 extends E>(
    this: TestAspect<R | R1, E | E1>,
    that: TestAspect<R1, E1>
  ): TestAspect<R & R1, E | E1> {
    return new TestAspect((predicate, spec) => that.some(predicate, this.some(predicate, spec)))
  }
}

export class ConstrainedTestAspect<R0, R, E0, E> {
  constructor(
    readonly some: (predicate: (label: string) => boolean, spec: S.XSpec<R0, E0>) => S.XSpec<R0 & R, E0 | E>
  ) {}

  all(spec: S.XSpec<R0, E0>): S.XSpec<R0 & R, E0 | E> {
    return this.some(constTrue, spec)
  }
}

export class PerTest<R, E> extends TestAspect<R, E> {
  constructor(
    readonly perTest: <R1, E1>(
      test: IO<R1, TestFailure<E1>, TestSuccess>
    ) => IO<R & R1, TestFailure<E | E1>, TestSuccess>
  ) {
    super((predicate: Predicate<string>, spec) =>
      S.transform_(
        spec,
        matchTag({
          Suite: (s) => s,
          Test: ({ label, test, annotations }) =>
            new S.TestCase(label, predicate(label) ? this.perTest(test) : test, annotations)
        })
      )
    )
  }
}

export class ConstrainedPerTest<R0, R, E0, E> extends ConstrainedTestAspect<R0, R, E0, E> {
  constructor(
    readonly perTest: (test: IO<R0, TestFailure<E0>, TestSuccess>) => IO<R0 & R, TestFailure<E0 | E>, TestSuccess>
  ) {
    super((predicate, spec) =>
      S.transform_(
        spec,
        matchTag({
          Suite: (s) => s,
          Test: ({ label, test, annotations }) =>
            new S.TestCase(label, predicate(label) ? this.perTest(test) : test, annotations)
        })
      )
    )
  }
}

export type TestAspectAtLeastR<R> = TestAspect<R, never>

export type TestAspectPoly = TestAspect<unknown, never>

export const identity: TestAspectPoly = new TestAspect((predicate, spec) => spec)

export const ignore: TestAspectAtLeastR<Has<Annotations>> = new TestAspect((predicate, spec) => S.when_(spec, false))

export function after<R, E>(effect: IO<R, E, any>): TestAspect<R, E> {
  return new PerTest((test) =>
    pipe(
      test,
      I.result,
      I.crossWith(I.result(I.catchAllCause_(effect, (cause) => I.fail(new RuntimeFailure(cause)))), Ex.apl_),
      I.bind(I.done)
    )
  )
}

export function around<R, E, A, R1>(
  before: I.IO<R, E, A>,
  after: (a: A) => I.IO<R1, never, any>
): TestAspect<R & R1, E> {
  return new PerTest((test) =>
    pipe(
      before,
      I.catchAllCause((c) => I.fail(new RuntimeFailure(c))),
      I.bracket(() => test, after)
    )
  )
}

export function aroundAll<R, E, A, R1>(
  before: I.IO<R, E, A>,
  after: (a: A) => I.IO<R1, never, any>
): TestAspect<R & R1, E> {
  return new TestAspect(<R0, E0>(predicate: (label: string) => boolean, spec: S.XSpec<R0, E0>) => {
    const aroundAll = (
      specs: M.Managed<R0, TestFailure<E0>, ReadonlyArray<S.Spec<R0, TestFailure<E0>, TestSuccess>>>
    ): M.Managed<R0 & R1 & R, TestFailure<E | E0>, ReadonlyArray<S.Spec<R0, TestFailure<E0>, TestSuccess>>> =>
      pipe(before, M.make(after), M.mapError(TF.fail), M.apr(specs))

    const around = (
      test: I.IO<R0, TestFailure<E0>, TestSuccess>
    ): I.IO<R0 & R1 & R, TestFailure<E | E0>, TestSuccess> =>
      pipe(
        before,
        I.mapError(TF.fail),
        I.bracket(() => test, after)
      )

    return matchTag_(spec.caseValue, {
      Suite: ({ label, specs, exec }) => S.suite(label, aroundAll(specs), exec),
      Test: ({ label, test, annotations }) => S.test(label, around(test), annotations)
    })
  })
}

export function aspect<R0, E0>(
  f: (_: I.IO<R0, TestFailure<E0>, TestSuccess>) => I.IO<R0, TestFailure<E0>, TestSuccess>
): ConstrainedTestAspect<R0, R0, E0, E0> {
  return new ConstrainedPerTest((test) => f(test))
}

export function before<R0>(effect: I.IO<R0, never, any>): TestAspect<R0, never> {
  return new PerTest((test) => I.apr_(effect, test))
}

export function beforeAll<R0, E0>(effect: I.IO<R0, E0, any>): TestAspect<R0, E0> {
  return aroundAll(effect, () => I.unit())
}

// TODO: restore environment
export const eventually = new PerTest((test) => I.eventually(test))

export function executionStrategy(exec: ExecutionStrategy): TestAspectPoly {
  return new TestAspect(
    <R1, E1>(predicate: (label: string) => boolean, spec: S.XSpec<R1, E1>): S.XSpec<R1, E1> =>
      S.transform_(
        spec,
        matchTag({
          Suite: (s) => (O.isNone(s.exec) && predicate(s.label) ? new S.SuiteCase(s.label, s.specs, O.some(exec)) : s),
          Test: (t) => t
        })
      )
  )
}

export function repeat<R0>(
  schedule: Schedule<R0, TestSuccess, any>
): TestAspectAtLeastR<R0 & Has<Annotations> & Has<Clock>> {
  return new PerTest(
    <R1, E1>(
      test: I.IO<R1, TestFailure<E1>, TestSuccess>
    ): I.IO<R0 & R1 & Has<Annotations> & Has<Clock>, TestFailure<E1>, TestSuccess> =>
      I.asksM((r: R0 & R1 & Has<Annotations> & Has<Clock>) =>
        pipe(
          test,
          I.giveAll(r),
          I.repeat(
            Sc.apr_(
              schedule,
              pipe(
                Sc.identity<TestSuccess>(),
                Sc.tapOutput((_) => Annotations.annotate(Annotation.repeated, 1)),
                Sc.giveAll(r)
              )
            )
          )
        )
      )
  )
}

export const nonFlaky: TestAspectAtLeastR<Has<Annotations> & Has<TestConfig>> = new PerTest((test) =>
  pipe(
    TestConfig.repeats,
    I.bind((n) =>
      I.apr_(
        test,
        pipe(
          test,
          I.tap((_) => Annotations.annotate(Annotation.repeated, 1)),
          I.repeatN(n - 1)
        )
      )
    )
  )
)

export function annotate<V>(key: TestAnnotation<V>, value: V): TestAspectPoly {
  return new TestAspect((predicate, spec) => S.annotate_(spec, key, value))
}

export function tag(tag: string): TestAspectPoly {
  return annotate(Annotation.tagged, pipe(Set.make({ ...Eq.string, hash: hashString }), Set.add(tag)))
}
