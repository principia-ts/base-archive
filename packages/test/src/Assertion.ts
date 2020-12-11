import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import type { Eq } from "@principia/core/Eq";
import * as BA from "@principia/core/FreeBooleanAlgebra";
import * as I from "@principia/core/IO";
import type { Cause } from "@principia/core/IO/Cause";
import * as C from "@principia/core/IO/Cause";
import type { Exit } from "@principia/core/IO/Exit";
import * as Ex from "@principia/core/IO/Exit";
import * as L from "@principia/core/List";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";
import * as Str from "@principia/core/String";
import type { Show } from "@principia/prelude";
import { fromShow } from "@principia/prelude";

import { asFailure, AssertionData } from "./AssertionData";
import { AssertionM } from "./AssertionM";
import { AssertionValue } from "./AssertionValue";
import type { AssertResult } from "./model";
import type { Render, RenderParam } from "./Render";
import { assertionParam, fn, infix, valueParam } from "./Render";

export class Assertion<A> extends AssertionM<A> {
  constructor(readonly render: Render<A>, readonly run: (actual: A) => AssertResult<A>) {
    super(render, (actual) => I.succeed(run(actual)));
  }

  ["&&"]<A1 extends A>(this: Assertion<A1>, that: Assertion<A1>): Assertion<A1> {
    return new Assertion(infix(assertionParam(this), "&&", assertionParam(that)), (actual) =>
      BA.and_(this.run(actual), that.run(actual))
    );
  }

  ["||"]<A1 extends A>(this: Assertion<A1>, that: Assertion<A1>): Assertion<A1> {
    return new Assertion(infix(assertionParam(this), "||", assertionParam(that)), (actual) =>
      BA.and_(this.run(actual), that.run(actual))
    );
  }

  [":"](string: string): Assertion<A> {
    return new Assertion(
      infix(assertionParam(this), ":", valueParam(Str.surround_(string, '"'))),
      this.run
    );
  }
}

export function assertion<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => boolean
): Assertion<A> {
  const assertion = (): Assertion<A> =>
    assertionDirect(name, params, (actual) => {
      const result = (): AssertResult<A> => {
        if (run(actual)) return BA.success(AssertionValue(assertion, actual, result));
        else return BA.failure(AssertionValue(assertion, actual, result));
      };
      return result();
    });
  return assertion();
}

export function assertionDirect<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => AssertResult<A>
): Assertion<A> {
  return new Assertion(fn(name, L.of(L.from(params))), run);
}

export function assertionRec<A, B>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  assertion: Assertion<B>,
  get: (_: A) => Option<B>,
  orElse: (data: AssertionData<A>) => AssertResult<A> = asFailure
): Assertion<A> {
  const resultAssertion = (): Assertion<A> =>
    assertionDirect(name, params, (a) =>
      O.fold_(
        get(a),
        () => orElse(AssertionData(resultAssertion(), a)),
        (b) => {
          const innerResult = assertion.run(b);
          const result = (): AssertResult<any> => {
            if (BA.isTrue(innerResult))
              return BA.success(AssertionValue(resultAssertion, a, result));
            else
              return BA.failure(
                AssertionValue(
                  () => assertion,
                  b,
                  () => innerResult
                )
              );
          };
          return result();
        }
      )
    );
  return resultAssertion();
}

export function approximatelyEquals<A extends number>(reference: A, tolerance: A): Assertion<A> {
  return assertion(
    "approximatelyEquals",
    [valueParam(reference), valueParam(tolerance)],
    (actual) => {
      const max = reference + tolerance;
      const min = reference - tolerance;
      return actual >= min && actual <= max;
    }
  );
}

export function contains<A>(element: A, eq: Eq<A>, show?: Show<A>): Assertion<ReadonlyArray<A>> {
  return assertion("contains", [valueParam(element, show)], A.elem(eq)(element));
}

export function containsCause<E>(cause: Cause<E>): Assertion<Cause<E>> {
  return assertion("containsCause", [valueParam(cause, fromShow(C.pretty))], C.contains(cause));
}

export function containsString(element: string): Assertion<string> {
  return assertion(
    "containsString",
    [valueParam(Str.surround_(element, '"'))],
    Str.contains(element)
  );
}

export function dies(assertion0: Assertion<any>): Assertion<Exit<any, any>> {
  return assertionRec(
    "dies",
    [assertionParam(assertion0)],
    assertion0,
    Ex.fold(C.dieOption, () => O.none())
  );
}
