import type { Render } from '../Render'
import type { AssertionValue } from './AssertionValue'

import * as BA from '../FreeBooleanAlgebra'
import { infix, param, quoted } from '../Render'

export type AssertResultM<A> = BA.FreeBooleanAlgebraM<unknown, never, AssertionValue<A>>

export class AssertionM<A> {
  readonly _tag = 'AssertionM'
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

  toString() {
    return this.render.toString()
  }
}

export function label_<A>(am: AssertionM<A>, string: string): AssertionM<A> {
  return am[':'](string)
}

export function label(string: string): <A>(am: AssertionM<A>) => AssertionM<A> {
  return (am) => am[':'](string)
}
