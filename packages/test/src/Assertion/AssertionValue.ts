import type { FreeBooleanAlgebra } from "@principia/core/FreeBooleanAlgebra";
import * as S from "@principia/core/Show";

import type { AssertionM } from "./AssertionM";

export class AssertionValue<A> {
  readonly _tag = "AssertionValue";
  constructor(
    readonly value: A,
    readonly assertion: () => AssertionM<A>,
    readonly result: () => FreeBooleanAlgebra<AssertionValue<A>>,
    readonly showA: S.Show<A> = S.any
  ) {}

  showValue(): string {
    return this.showA.show(this.value);
  }

  isSameAssertionAs(that: AssertionValue<A>) {
    return this.assertion().toString() === that.assertion().toString();
  }
}
