import type { FreeBooleanAlgebra } from "@principia/core/FreeBooleanAlgebra";
import type { Show } from "@principia/prelude";
import * as S from "@principia/prelude/Show";

import type { AssertionM } from "./AssertionM";

export class AssertionValue<A> {
  readonly _tag = "AssertionValue";
  constructor(
    readonly value: A,
    readonly assertion: () => AssertionM<A>,
    readonly result: () => FreeBooleanAlgebra<AssertionValue<A>>,
    readonly showA: Show<A> = S.any
  ) {}

  showValue(): string {
    return this.showA.show(this.value);
  }

  isSameAssertionAs(that: AssertionValue<A>) {
    return this.assertion().toString() === that.assertion().toString();
  }
}
