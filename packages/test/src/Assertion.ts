import * as A from "@principia/core/Array";
import type { Eq } from "@principia/core/Eq";
import type { FreeBooleanAlgebra } from "@principia/core/FreeBooleanAlgebra";
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
import * as S from "@principia/prelude/Show";

import { asFailure, AssertionData } from "./AssertionData";
import { AssertionM } from "./AssertionM";
import { AssertionValue } from "./AssertionValue";
import type { AssertResult } from "./model";
import type { Render, RenderParam } from "./Render";
import { assertionParam, fn, infix, valueParam } from "./Render";
import type { WidenLiteral } from "./utils";

export class Assertion<A> extends AssertionM<A> {
  constructor(readonly render: Render, readonly run: (actual: A) => AssertResult<A>) {
    super(render, (actual) => I.succeed(run(actual)));
  }

  ["&&"](this: Assertion<A>, that: Assertion<A>): Assertion<A> {
    return new Assertion(infix(assertionParam(this), "&&", assertionParam(that)), (actual) =>
      BA.and_(this.run(actual), that.run(actual))
    );
  }

  ["||"](this: Assertion<A>, that: Assertion<A>): Assertion<A> {
    return new Assertion(infix(assertionParam(this), "||", assertionParam(that)), (actual) =>
      BA.or_(this.run(actual), that.run(actual))
    );
  }

  [":"](string: string): Assertion<A> {
    return new Assertion(
      infix(assertionParam(this), ":", valueParam(Str.surround_(string, '"'))),
      this.run
    );
  }
}

export function and<A>(that: Assertion<A>): (self: Assertion<A>) => Assertion<A> {
  return (self) => self["&&"](that);
}

export function or<A>(that: Assertion<A>): (self: Assertion<A>) => Assertion<A> {
  return (self) => self["||"](that);
}

export function assertion<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => boolean,
  show?: Show<A>
): Assertion<A> {
  const assertion = (): Assertion<A> =>
    assertionDirect(name, params, (actual) => {
      const result = (): FreeBooleanAlgebra<AssertionValue<A>> => {
        if (run(actual)) return BA.success(new AssertionValue(actual, assertion, result, show));
        else return BA.failure(new AssertionValue(actual, assertion, result, show));
      };
      return result();
    });
  return assertion();
}

export function assertionDirect<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => FreeBooleanAlgebra<AssertionValue<A>>
): Assertion<A> {
  return new Assertion(fn(name, L.of(L.from(params))), run);
}

export function assertionRec<A, B>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  assertion: Assertion<B>,
  get: (_: A) => Option<B>,
  { showA, showB }: { showA?: Show<A>; showB?: Show<B> } = {},
  orElse: (data: AssertionData<A>) => FreeBooleanAlgebra<AssertionValue<A>> = asFailure
): Assertion<A> {
  const resultAssertion = (): Assertion<A> =>
    assertionDirect(name, params, (a) =>
      O.fold_(
        get(a),
        () => orElse(AssertionData(resultAssertion(), a)),
        (b) => {
          const innerResult = assertion.run(b);
          const result = (): FreeBooleanAlgebra<AssertionValue<any>> => {
            if (BA.isTrue(innerResult))
              return BA.success(new AssertionValue(a, resultAssertion, result, showA));
            else
              return BA.failure(
                new AssertionValue(
                  b,
                  () => assertion,
                  () => innerResult,
                  showB
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
    },
    S.number as Show<A>
  );
}

export function contains<A>(element: A, eq: Eq<A>, show?: Show<A>): Assertion<ReadonlyArray<A>> {
  return assertion(
    "contains",
    [valueParam(element, show)],
    A.elem(eq)(element),
    A.getShow(show ?? S.any)
  );
}

export function containsCause<E>(cause: Cause<E>): Assertion<Cause<E>> {
  return assertion("containsCause", [valueParam(cause, fromShow(C.pretty))], C.contains(cause));
}

export function containsString(element: string): Assertion<string> {
  return assertion(
    "containsString",
    [valueParam(Str.surround_(element, '"'))],
    Str.contains(element),
    S.string
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

export function hasMessage(message: Assertion<string>): Assertion<Error> {
  return assertionRec("hasMessage", [assertionParam(message)], message, (error) =>
    O.some(error.message)
  );
}

export function endsWith<A>(
  suffix: ReadonlyArray<A>,
  eq: Eq<A>,
  show?: Show<A>
): Assertion<ReadonlyArray<A>> {
  return assertion(
    "endsWith",
    [valueParam(suffix, show ? A.getShow(show) : undefined)],
    (as) => {
      const dropped = A.drop_(as, as.length - suffix.length);
      if (dropped.length !== suffix.length) return false;
      for (let i = 0; i < dropped.length; i++) {
        if (!eq.equals_(dropped[i], suffix[i])) {
          return false;
        }
      }
      return true;
    },
    show && A.getShow(show)
  );
}

export function equalTo<A>(expected: A, eq: Eq<A>, show?: Show<A>): Assertion<A> {
  return assertion("equalTo", [valueParam(expected, show)], (actual) =>
    eq.equals_(actual, expected)
  );
}

export function not<A>(assertion: Assertion<A>): Assertion<A> {
  return assertionDirect("not", [assertionParam(assertion)], (actual) =>
    BA.not(assertion.run(actual))
  );
}
