import * as BA from "@principia/core/FreeBooleanAlgebra";
import type { Has } from "@principia/core/Has";
import type { IO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import * as C from "@principia/core/IO/Cause";
import * as Ex from "@principia/core/IO/Exit";
import { matchTag } from "@principia/core/Utils";
import type { Predicate } from "@principia/prelude";
import { constTrue, flow, pipe } from "@principia/prelude";

import type { Annotations } from "./Annotations";
import type { XSpec } from "./model";
import * as S from "./Spec";
import type { TestFailure } from "./TestFailure";
import { AssertionFailure, RuntimeFailure } from "./TestFailure";
import type { TestSuccess } from "./TestSuccess";
import { Succeeded } from "./TestSuccess";

export class TestAspect<R, E> {
  readonly _R!: (_: R) => void;
  readonly _E!: () => E;

  constructor(
    readonly some: <R1, E1>(
      predicate: (label: string) => boolean,
      spec: XSpec<R1, E1>
    ) => XSpec<R & R1, E | E1>
  ) {}

  all<R1, E1>(spec: XSpec<R1, E1>): XSpec<R & R1, E | E1> {
    return this.some(constTrue, spec);
  }

  [">>>"]<R1 extends R, E1 extends E>(
    this: TestAspect<R | R1, E | E1>,
    that: TestAspect<R1, E1>
  ): TestAspect<R & R1, E | E1> {
    return new TestAspect((predicate, spec) => that.some(predicate, this.some(predicate, spec)));
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
    );
  }
}

export type TestAspectAtLeastR<R> = TestAspect<R, never>;

export type TestAspectPoly = TestAspect<unknown, never>;

export const identity: TestAspectPoly = new TestAspect((predicate, spec) => spec);

export const ignore: TestAspectAtLeastR<Has<Annotations>> = new TestAspect((predicate, spec) =>
  S.when_(spec, false)
);

export function after<R, E>(effect: IO<R, E, any>): TestAspect<R, E> {
  return new PerTest((test) =>
    pipe(
      test,
      I.result,
      I.zipWith(
        I.result(I.catchAllCause_(effect, (cause) => I.fail(new RuntimeFailure(cause)))),
        Ex.apFirst_
      ),
      I.chain(I.done)
    )
  );
}
