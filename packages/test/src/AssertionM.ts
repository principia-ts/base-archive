import type { FreeBooleanAlgebraM } from "@principia/core/FreeBooleanAlgebra";
import * as FB from "@principia/core/FreeBooleanAlgebra";
import * as Str from "@principia/core/String";

import type { AssertionValue } from "./AssertionValue";
import type { AssertResultM } from "./model";
import type { Render } from "./Render/Render";
import { infix } from "./Render/Render";
import { assertionParam, valueParam } from "./Render/RenderParam";

export class AssertionM<A> {
  readonly _tag = "AssertionM";
  constructor(readonly render: Render, readonly runM: (actual: A) => AssertResultM<A>) {}

  ["&&"]<A1 extends A>(this: AssertionM<A1>, that: AssertionM<A1>): AssertionM<A1> {
    return new AssertionM(infix(assertionParam(this), "&&", assertionParam(that)), (actual) =>
      FB.andM_(this.runM(actual), that.runM(actual))
    );
  }
  [":"](string: string): AssertionM<A> {
    return new AssertionM(
      infix(assertionParam(this), ":", valueParam(Str.surround_(string, '"'))),
      this.runM
    );
  }
  ["||"]<A1 extends A>(this: AssertionM<A1>, that: AssertionM<A1>): AssertionM<A1> {
    return new AssertionM(infix(assertionParam(this), "||", assertionParam(that)), (actual) =>
      FB.orM_(this.runM(actual), that.runM(actual))
    );
  }

  toString() {
    return this.render.toString();
  }
}

export function label_<A>(am: AssertionM<A>, string: string): AssertionM<A> {
  return am["??"](string);
}

export function label(string: string): <A>(am: AssertionM<A>) => AssertionM<A> {
  return (am) => am[":"](string);
}
