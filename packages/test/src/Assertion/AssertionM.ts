import type { Render } from '../Render'
import type { AssertionValue } from './AssertionValue'

import { isObject } from '@principia/base/prelude'

import * as BA from '../FreeBooleanAlgebra'
import { infix, param, quoted } from '../Render'

export type AssertResultM<A> = BA.FreeBooleanAlgebraM<unknown, never, AssertionValue<A>>

export const AssertionMTypeId = Symbol('@principia/test/AssertionM')
export type AssertionMTypeId = typeof AssertionMTypeId

export class AssertionM<A> {
  readonly [AssertionMTypeId]: AssertionMTypeId = AssertionMTypeId

  constructor(readonly render: Render, readonly runM: (actual: A) => AssertResultM<A>) {}

  ['&&'](this: AssertionM<A>, that: AssertionM<A>): AssertionM<A> {
    return new AssertionM(infix(param(this), '&&', param(that)), (actual) =>
      BA.andM_(this.runM(actual), that.runM(actual))
    )
  }
  [':'](string: string): AssertionM<A> {
    return new AssertionM(infix(param(this), ':', param(quoted(string))), this.runM)
  }
  ['||'](this: AssertionM<A>, that: AssertionM<A>): AssertionM<A> {
    return new AssertionM(infix(param(this), '||', param(that)), (actual) =>
      BA.orM_(this.runM(actual), that.runM(actual))
    )
  }

  get rendered() {
    return this.render.rendered
  }
}

export function isAssertionM(u: unknown): u is AssertionM<unknown> {
  return isObject(u) && AssertionMTypeId in u
}

export function label_<A>(am: AssertionM<A>, string: string): AssertionM<A> {
  return am[':'](string)
}

export function label(string: string): <A>(am: AssertionM<A>) => AssertionM<A> {
  return (am) => am[':'](string)
}
