import type { Render, RenderParam } from '../Render'
import type { WidenLiteral } from '../util'
import type { Eq } from '@principia/base/Eq'
import type { Exit } from '@principia/io/Exit'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/Function'
import * as It from '@principia/base/Iterable'
import * as L from '@principia/base/List'
import * as O from '@principia/base/Option'
import * as S from '@principia/base/Show'
import * as Str from '@principia/base/String'
import * as C from '@principia/io/Cause'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import assert from 'assert'

import * as BA from '../FreeBooleanAlgebra'
import { field, fn, infix, param, quoted } from '../Render'
import { asFailure, AssertionData, asSuccess } from './AssertionData'
import { AssertionM } from './AssertionM'
import { AssertionValue } from './AssertionValue'

export type AssertResult<A> = BA.FreeBooleanAlgebra<AssertionValue<A>>

export class Assertion<A> extends AssertionM<A> {
  constructor(readonly render: Render, readonly run: (actual: A) => AssertResult<A>) {
    super(render, (actual) => I.succeed(run(actual)))
  }

  test(a: A): boolean {
    return BA.isTrue(this.run(a))
  }

  ['&&'](this: Assertion<A>, that: Assertion<A>): Assertion<A> {
    return new Assertion(infix(param(this), '&&', param(that)), (actual) => BA.and_(this.run(actual), that.run(actual)))
  }

  ['||'](this: Assertion<A>, that: Assertion<A>): Assertion<A> {
    return new Assertion(infix(param(this), '||', param(that)), (actual) => BA.or_(this.run(actual), that.run(actual)))
  }

  [':'](string: string): Assertion<A> {
    return new Assertion(infix(param(this), ':', param(quoted(string))), this.run)
  }
}

export function and<A>(that: Assertion<A>): (self: Assertion<A>) => Assertion<A> {
  return (self) => self['&&'](that)
}

export function or<A>(that: Assertion<A>): (self: Assertion<A>) => Assertion<A> {
  return (self) => self['||'](that)
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
        if (run(actual)) {
          return BA.success(new AssertionValue(actual, assertion, result, show))
        } else {
          return BA.failure(new AssertionValue(actual, assertion, result, show))
        }
      }
      return result()
    })
  return assertion()
}

export function assertionDirect<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => BA.FreeBooleanAlgebra<AssertionValue<A>>
): Assertion<A> {
  return new Assertion(fn(name, L.of(L.from(params))), run)
}

export function assertionRec<A, B>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  assertion: Assertion<B>,
  get: (_: A) => O.Option<B>,
  { showA, showB }: { showA?: S.Show<A>, showB?: S.Show<B> } = {},
  orElse: (data: AssertionData<A>) => BA.FreeBooleanAlgebra<AssertionValue<A>> = asFailure
): Assertion<A> {
  const resultAssertion = (): Assertion<A> =>
    assertionDirect(name, params, (a) =>
      O.match_(
        get(a),
        () => orElse(AssertionData(resultAssertion(), a)),
        (b) => {
          const innerResult = assertion.run(b)
          const result      = (): BA.FreeBooleanAlgebra<AssertionValue<any>> => {
            if (BA.isTrue(innerResult)) {
              return BA.success(new AssertionValue(a, resultAssertion, result, showA))
            } else {
              return BA.failure(
                new AssertionValue(
                  b,
                  () => assertion,
                  () => innerResult,
                  showB
                )
              )
            }
          }
          return result()
        }
      )
    )
  return resultAssertion()
}

export const anything: Assertion<any> = assertion('anything', [], () => true)

export function approximatelyEquals<A extends number>(reference: A, tolerance: A): Assertion<A> {
  return assertion(
    'approximatelyEquals',
    [param(reference), param(tolerance)],
    (actual) => {
      const max = reference + tolerance
      const min = reference - tolerance
      return actual >= min && actual <= max
    },
    S.number as S.Show<A>
  )
}

export function contains<A>(element: A, eq: Eq<A>, show?: S.Show<A>): Assertion<ReadonlyArray<A>> {
  return assertion('contains', [param(element, show)], A.elem(eq)(element), A.getShow(show ?? S.any))
}

export function containsCause<E>(cause: C.Cause<E>): Assertion<C.Cause<E>> {
  return assertion('containsCause', [param(cause, S.makeShow(C.pretty))], C.contains(cause))
}

export function containsString(element: string): Assertion<string> {
  return assertion('containsString', [param(Str.surround_(element, '"'))], Str.contains(element), S.string)
}

export function deepStrictEqualTo(expected: any, show?: S.Show<any>): Assertion<any> {
  return assertion('deepStrictEquals', [param(expected, show)], (actual) =>
    pipe(
      O.tryCatch(() => assert.deepStrictEqual(actual, expected)),
      O.match(
        () => false,
        () => true
      )
    )
  )
}

export function dies(assertion0: Assertion<any>): Assertion<Ex.Exit<any, any>> {
  return assertionRec(
    'dies',
    [param(assertion0)],
    assertion0,
    Ex.fold(C.dieOption, () => O.None())
  )
}

export function exists<A>(assertion: Assertion<A>): Assertion<Iterable<A>> {
  return assertionRec('exists', [param(assertion)], assertion, It.findFirst(assertion.test))
}

export function fails<E>(assertion: Assertion<E>): Assertion<Exit<E, any>> {
  return assertionRec(
    'fails',
    [param(assertion)],
    assertion,
    Ex.fold(flow(C.failures, A.head), () => O.None())
  )
}

export function forall<A>(assertion: Assertion<A>): Assertion<Iterable<A>> {
  return assertionRec(
    'forall',
    [param(assertion)],
    assertion,
    It.findFirst((a) => !assertion.test(a)),
    {},
    asSuccess
  )
}

export function hasField<A, B>(name: string, proj: (a: A) => B, assertion: Assertion<B>): Assertion<A> {
  return assertionRec('hasField', [param(quoted(name)), param(field(name)), param(assertion)], assertion, (actual) =>
    O.Some(proj(actual))
  )
}

export function hasMessage(message: Assertion<string>): Assertion<Error> {
  return assertionRec('hasMessage', [param(message)], message, (error) => O.Some(error.message))
}

export function endsWith<A>(suffix: ReadonlyArray<A>, eq: Eq<A>, show?: S.Show<A>): Assertion<ReadonlyArray<A>> {
  return assertion(
    'endsWith',
    [param(suffix, show ? A.getShow(show) : undefined)],
    (as) => {
      const dropped = A.drop_(as, as.length - suffix.length)
      if (dropped.length !== suffix.length) {
        return false
      }
      for (let i = 0; i < dropped.length; i++) {
        if (!eq.equals_(dropped[i], suffix[i])) {
          return false
        }
      }
      return true
    },
    show && A.getShow(show)
  )
}

export function equalTo<A>(
  expected: WidenLiteral<A>,
  eq: Eq<WidenLiteral<A>>,
  show?: S.Show<WidenLiteral<A>>
): Assertion<WidenLiteral<A>> {
  return assertion('equalTo', [param(expected, show)], (actual) => eq.equals_(actual, expected))
}

export function isLeft<A>(assertion: Assertion<A>): Assertion<E.Either<A, any>> {
  return assertionRec(
    'isLeft',
    [param(assertion)],
    assertion,
    E.match(O.Some, () => O.None())
  )
}

export const isNone: Assertion<O.Option<any>> = assertion('isNone', [], O.isNone)

export function isRight<A>(assertion: Assertion<A>): Assertion<E.Either<any, A>> {
  return assertionRec(
    'isRight',
    [param(assertion)],
    assertion,
    E.match(() => O.None(), O.Some)
  )
}

export function isSome<A>(assertion: Assertion<A>): Assertion<O.Option<A>> {
  return assertionRec('isSome', [param(assertion)], assertion, identity)
}

export function not<A>(assertion: Assertion<A>): Assertion<A> {
  return assertionDirect('not', [param(assertion)], (actual) => BA.not(assertion.run(actual)))
}

export function succeeds<A>(assertion: Assertion<A>): Assertion<Exit<any, A>> {
  return assertionRec(
    'succeeds',
    [param(assertion)],
    assertion,
    Ex.fold(() => O.None(), O.Some)
  )
}
