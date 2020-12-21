import type { Render, RenderParam } from "../Render";
import type { Eq } from "@principia/base/data/Eq";

import * as A from "@principia/base/data/Array";
import * as L from "@principia/base/data/List";
import * as O from "@principia/base/data/Option";
import * as S from "@principia/base/data/Show";
import * as Str from "@principia/base/data/String";
import * as C from "@principia/io/Cause";
import * as Ex from "@principia/io/Exit";
import * as I from "@principia/io/IO";

import * as BA from "../FreeBooleanAlgebra";
import { assertionParam, fn, infix, valueParam } from "../Render";
import { asFailure, AssertionData } from "./AssertionData";
import { AssertionM } from "./AssertionM";
import { AssertionValue } from "./AssertionValue";

export type AssertResult<A> = BA.FreeBooleanAlgebra<AssertionValue<A>>;

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
  show?: S.Show<A>
): Assertion<A> {
  const assertion = (): Assertion<A> =>
    assertionDirect(name, params, (actual) => {
      const result = (): BA.FreeBooleanAlgebra<AssertionValue<A>> => {
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
  run: (actual: A) => BA.FreeBooleanAlgebra<AssertionValue<A>>
): Assertion<A> {
  return new Assertion(fn(name, L.of(L.from(params))), run);
}

export function assertionRec<A, B>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  assertion: Assertion<B>,
  get: (_: A) => O.Option<B>,
  { showA, showB }: { showA?: S.Show<A>; showB?: S.Show<B> } = {},
  orElse: (data: AssertionData<A>) => BA.FreeBooleanAlgebra<AssertionValue<A>> = asFailure
): Assertion<A> {
  const resultAssertion = (): Assertion<A> =>
    assertionDirect(name, params, (a) =>
      O.fold_(
        get(a),
        () => orElse(AssertionData(resultAssertion(), a)),
        (b) => {
          const innerResult = assertion.run(b);
          const result = (): BA.FreeBooleanAlgebra<AssertionValue<any>> => {
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
    S.number as S.Show<A>
  );
}

export function contains<A>(element: A, eq: Eq<A>, show?: S.Show<A>): Assertion<ReadonlyArray<A>> {
  return assertion(
    "contains",
    [valueParam(element, show)],
    A.elem(eq)(element),
    A.getShow(show ?? S.any)
  );
}

export function containsCause<E>(cause: C.Cause<E>): Assertion<C.Cause<E>> {
  return assertion("containsCause", [valueParam(cause, S.makeShow(C.pretty))], C.contains(cause));
}

export function containsString(element: string): Assertion<string> {
  return assertion(
    "containsString",
    [valueParam(Str.surround_(element, '"'))],
    Str.contains(element),
    S.string
  );
}

export function dies(assertion0: Assertion<any>): Assertion<Ex.Exit<any, any>> {
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
  show?: S.Show<A>
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

export function equalTo<A>(expected: A, eq: Eq<A>, show?: S.Show<A>): Assertion<A> {
  return assertion("equalTo", [valueParam(expected, show)], (actual) =>
    eq.equals_(actual, expected)
  );
}

export function not<A>(assertion: Assertion<A>): Assertion<A> {
  return assertionDirect("not", [assertionParam(assertion)], (actual) =>
    BA.not(assertion.run(actual))
  );
}
