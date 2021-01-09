import type { Render } from '../Render'
import type { AssertionValue } from './AssertionValue'

import * as Str from '@principia/base/String'

import * as BA from '../FreeBooleanAlgebra'
import { infix } from '../Render'
import { assertionParam, valueParam } from '../Render/RenderParam'

export type AssertResultM<A> = BA.FreeBooleanAlgebraM<unknown, never, AssertionValue<A>>

export class AssertionM<A> {
  readonly _tag = 'AssertionM'
  constructor(readonly render: Render, readonly runM: (actual: A) => AssertResultM<A>) {}

  ['&&'](this: AssertionM<A>, that: AssertionM<A>): AssertionM<A> {
    return new AssertionM(infix(assertionParam(this), '&&', assertionParam(that)), (actual) =>
      BA.andM_(this.runM(actual), that.runM(actual))
    )
  }
  [':'](string: string): AssertionM<A> {
    return new AssertionM(infix(assertionParam(this), ':', valueParam(Str.surround_(string, '"'))), this.runM)
  }
  ['||'](this: AssertionM<A>, that: AssertionM<A>): AssertionM<A> {
    return new AssertionM(infix(assertionParam(this), '||', assertionParam(that)), (actual) =>
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
